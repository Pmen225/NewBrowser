import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { WebSocketServer } from "ws";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const EXTENSION_PATH = path.join(ROOT, "extension");

function prepareTestExtension(sidecarOrigin: string): string {
  const tempExtensionDir = mkdtempSync(path.join(tmpdir(), "new-browser-attachments-extension-"));
  cpSync(EXTENSION_PATH, tempExtensionDir, { recursive: true });

  const panelPath = path.join(tempExtensionDir, "panel.js");
  const panelSource = readFileSync(panelPath, "utf8");
  const sidecarUrl = new URL(sidecarOrigin);
  const wsOrigin = `${sidecarUrl.protocol === "https:" ? "wss" : "ws"}://${sidecarUrl.host}`;

  const patchedSource = panelSource
    .replaceAll('const SIDECAR_WS   = "ws://127.0.0.1:3210";', `const SIDECAR_WS   = "${wsOrigin}";`)
    .replaceAll("http://127.0.0.1:3210", sidecarOrigin);

  if (patchedSource === panelSource) {
    throw new Error("Failed to patch panel sidecar URLs in temporary extension");
  }

  writeFileSync(panelPath, patchedSource, "utf8");
  return tempExtensionDir;
}

async function resolveExtensionId(context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>): Promise<string> {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  const extensionId = serviceWorker.url().split("/")[2];
  if (!extensionId) {
    throw new Error("Unable to resolve extension id");
  }
  return extensionId;
}

async function startFixtureServer(): Promise<{ origin: string; close: () => Promise<void> }> {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Attachment Target</title>
  </head>
  <body>
    <main>
      <h1>Attachment target page</h1>
      <p>This page exists only so the extension can capture a real screenshot.</p>
    </main>
  </body>
</html>`;

  const server = createServer((request, response) => {
    if ((request.url ?? "/") !== "/") {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start fixture server");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, "close");
    }
  };
}

interface SidecarStub {
  origin: string;
  waitForRpcConnection: () => Promise<void>;
  waitForEventStream: () => Promise<void>;
  waitForAgentRuns: (count: number) => Promise<void>;
  getLastAgentRunParams: () => Record<string, unknown> | null;
  getAgentRunParams: (index: number) => Record<string, unknown> | null;
  close: () => Promise<void>;
}

async function startSidecarStub(): Promise<SidecarStub> {
  const sseClients = new Set<ServerResponse>();
  let agentRunCount = 0;
  let lastAgentRunParams: Record<string, unknown> | null = null;
  const agentRunParams: Record<string, unknown>[] = [];
  let resolveSseConnection: (() => void) | null = null;
  let resolveRpcConnection: (() => void) | null = null;
  let sseConnected = false;
  let rpcConnected = false;

  const sseConnectionPromise = new Promise<void>((resolve) => {
    resolveSseConnection = resolve;
  });
  const rpcConnectionPromise = new Promise<void>((resolve) => {
    resolveRpcConnection = resolve;
  });

  async function waitForAgentRuns(count: number): Promise<void> {
    const start = Date.now();
    while (agentRunCount < count) {
      if (Date.now() - start > 5_000) {
        throw new Error(`Timed out waiting for ${count} AgentRun calls`);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  function broadcastResult(runId: string): void {
    const data = JSON.stringify({
      payload: {
        run_id: runId,
        final_answer: "Processed screenshot attachment."
      }
    });

    for (const client of sseClients) {
      client.write("event: result\n");
      client.write(`data: ${data}\n\n`);
    }
  }

  const httpServer = createServer((request: IncomingMessage, response: ServerResponse) => {
    if ((request.url ?? "").startsWith("/events")) {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "access-control-allow-origin": "*"
      });
      response.write("\n");
      sseClients.add(response);
      if (!sseConnected) {
        sseConnected = true;
        resolveSseConnection?.();
      }
      request.on("close", () => {
        sseClients.delete(response);
      });
      return;
    }

    if ((request.url ?? "").startsWith("/health")) {
      response.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  const wsServer = new WebSocketServer({ noServer: true });
  let runOrdinal = 0;

  wsServer.on("connection", (socket) => {
    if (!rpcConnected) {
      rpcConnected = true;
      resolveRpcConnection?.();
    }

    socket.on("message", (raw) => {
      const request = JSON.parse(String(raw)) as {
        request_id: string;
        action: string;
        params?: Record<string, unknown>;
      };

      const respond = (result: unknown) => {
        socket.send(
          JSON.stringify({
            request_id: request.request_id,
            ok: true,
            result
          })
        );
      };

      if (request.action === "AgentRun") {
        runOrdinal += 1;
        agentRunCount += 1;
        lastAgentRunParams = request.params ?? null;
        if (request.params) {
          agentRunParams.push(request.params);
        }
        const runId = `run-${runOrdinal}`;
        respond({ run_id: runId });
        setTimeout(() => broadcastResult(runId), 50);
        return;
      }

      if (request.action === "AgentStop") {
        respond({ stopped: true });
        return;
      }

      socket.send(
        JSON.stringify({
          request_id: request.request_id,
          ok: false,
          error: {
            code: "UNSUPPORTED_ACTION",
            message: `Unsupported action: ${request.action}`
          },
          retryable: false
        })
      );
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url !== "/rpc") {
      socket.destroy();
      return;
    }
    wsServer.handleUpgrade(request, socket, head, (client) => {
      wsServer.emit("connection", client, request);
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve sidecar stub address");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    waitForEventStream: async () => {
      if (sseConnected) {
        return;
      }
      await sseConnectionPromise;
    },
    waitForRpcConnection: async () => {
      if (rpcConnected) {
        return;
      }
      await rpcConnectionPromise;
    },
    waitForAgentRuns,
    getLastAgentRunParams: () => lastAgentRunParams,
    getAgentRunParams: (index: number) => agentRunParams[index] ?? null,
    close: async () => {
      for (const client of sseClients) {
        client.end();
      }
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await new Promise<void>((resolve) => {
        wsServer.close(() => resolve());
      });
    }
  };
}

describe("Panel image attachments", () => {
  it("sends screenshot attachments to AgentRun as image inputs", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const fixtureServer = await startFixtureServer();
    const sidecarStub = await startSidecarStub();
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-attachments-profile-"));

    let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
    try {
      try {
        context = await chromium.launchPersistentContext(profileDir, {
          channel: "chromium",
          headless: false,
          args: [
            `--disable-extensions-except=${testExtensionDir}`,
            `--load-extension=${testExtensionDir}`
          ]
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to launch Playwright Chromium. Run 'npx playwright install chromium'. ${message}`);
      }

      const extensionId = await resolveExtensionId(context);
      const webPage = await context.newPage();
      await webPage.goto(fixtureServer.origin, { waitUntil: "domcontentloaded" });

      const panelPage = await context.newPage();
      await panelPage.goto(`chrome-extension://${extensionId}/panel.html`);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.locator("#btn-plus").click();
      await panelPage.locator("#plus-screenshot").waitFor({ state: "visible", timeout: 5_000 });
      await panelPage.locator("#plus-screenshot").click();
      await panelPage.locator(".attachment-chip").first().waitFor({ state: "visible", timeout: 8_000 });

      await panelPage.getByLabel("Ask anything").fill("Describe the attached screenshot.");
      await panelPage.getByRole("button", { name: "Send" }).click();

      await sidecarStub.waitForAgentRuns(1);
      const params = sidecarStub.getLastAgentRunParams();
      expect(params).not.toBeNull();
      expect(params?.has_image_input).toBe(true);
      expect(Array.isArray(params?.images)).toBe(true);
      expect((params?.images as unknown[]).length).toBeGreaterThan(0);
      expect(typeof (params?.images as string[])[0]).toBe("string");
      expect(((params?.images as string[])[0] ?? "").startsWith("data:image/png;base64,")).toBe(true);
    } finally {
      if (context) {
        await context.close();
      }
      await sidecarStub.close();
      await fixtureServer.close();
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(testExtensionDir, { recursive: true, force: true });
    }
  }, 45_000);

  it("includes prior chat turns in follow-up AgentRun payloads", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const fixtureServer = await startFixtureServer();
    const sidecarStub = await startSidecarStub();
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-history-profile-"));

    let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
    try {
      try {
        context = await chromium.launchPersistentContext(profileDir, {
          channel: "chromium",
          headless: false,
          args: [
            `--disable-extensions-except=${testExtensionDir}`,
            `--load-extension=${testExtensionDir}`
          ]
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to launch Playwright Chromium. Run 'npx playwright install chromium'. ${message}`);
      }

      const extensionId = await resolveExtensionId(context);
      const webPage = await context.newPage();
      await webPage.goto(fixtureServer.origin, { waitUntil: "domcontentloaded" });

      const panelPage = await context.newPage();
      await panelPage.goto(`chrome-extension://${extensionId}/panel.html`);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Can you go to Google?");
      await panelPage.getByRole("button", { name: "Send" }).click();
      await sidecarStub.waitForAgentRuns(1);
      await panelPage.getByText("Processed screenshot attachment.").waitFor({ state: "visible", timeout: 8_000 });

      await panelPage.getByLabel("Ask anything").fill("Do you remember the previous prompt?");
      await panelPage.getByRole("button", { name: "Send" }).click();
      await sidecarStub.waitForAgentRuns(2);

      const secondParams = sidecarStub.getAgentRunParams(1);
      expect(secondParams).not.toBeNull();
      expect(secondParams?.history_messages).toEqual([
        { role: "user", text: "Can you go to Google?" },
        { role: "assistant", text: "Processed screenshot attachment." }
      ]);
    } finally {
      if (context) {
        await context.close();
      }
      await sidecarStub.close();
      await fixtureServer.close();
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(testExtensionDir, { recursive: true, force: true });
    }
  }, 45_000);
});
