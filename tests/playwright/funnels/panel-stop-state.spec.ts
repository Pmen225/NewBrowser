import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "playwright";
import { WebSocketServer } from "ws";
import { describe, expect, it } from "vitest";

import {
  launchManagedPersistentContext,
  resolveExtensionId,
  safePageScreenshot,
  withTimeout
} from "../helpers/runtime-guards";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const EXTENSION_PATH = path.join(ROOT, "extension");

function prepareTestExtension(sidecarOrigin: string): string {
  const tempExtensionDir = mkdtempSync(path.join(tmpdir(), "new-browser-stop-extension-"));
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

interface SidecarStub {
  origin: string;
  waitForRpcConnection: () => Promise<void>;
  waitForEventStream: () => Promise<void>;
  waitForActionCount: (action: string, count: number) => Promise<void>;
  getActions: () => string[];
  close: () => Promise<void>;
}

async function startSidecarStub(): Promise<SidecarStub> {
  const sseClients = new Set<ServerResponse>();
  const actions: string[] = [];
  const actionCounts = new Map<string, number>();
  let lastRunId = "run-1";
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

  async function waitForActionCount(action: string, count: number): Promise<void> {
    const start = Date.now();
    while ((actionCounts.get(action) ?? 0) < count) {
      if (Date.now() - start > 5_000) {
        throw new Error(`Timed out waiting for ${count} ${action} call(s)`);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  function broadcastResult(payload: Record<string, unknown>): void {
    const data = JSON.stringify({ payload });
    for (const client of sseClients) {
      client.write("event: result\n");
      client.write(`data: ${data}\n\n`);
    }
  }

  function broadcastStatus(payload: Record<string, unknown>): void {
    const data = JSON.stringify({ payload });
    for (const client of sseClients) {
      client.write("event: status\n");
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

    if ((request.url ?? "").startsWith("/fixture")) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "access-control-allow-origin": "*"
      });
      response.end("<!doctype html><html><head><title>Fixture page</title></head><body><main><h1>Fixture page</h1><p>Overlay target.</p></main></body></html>");
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  const wsServer = new WebSocketServer({ noServer: true });

  wsServer.on("connection", (socket) => {
    if (!rpcConnected) {
      rpcConnected = true;
      resolveRpcConnection?.();
    }

    socket.on("message", (raw) => {
      const request = JSON.parse(String(raw)) as {
        request_id: string;
        action: string;
      };
      actions.push(request.action);
      actionCounts.set(request.action, (actionCounts.get(request.action) ?? 0) + 1);

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
        respond({ run_id: lastRunId, status: "started" });
        setTimeout(() => {
          broadcastStatus({
            run_id: lastRunId,
            status: "tool_start",
            tool_name: "navigate",
            tool_call_id: "call-1",
            tool_input: {
              url: "https://example.com"
            }
          });
        }, 20);
        return;
      }

      if (request.action === "AgentPause") {
        respond({ run_id: lastRunId, status: "pausing" });
        setTimeout(() => {
          broadcastStatus({
            run_id: lastRunId,
            status: "pausing"
          });
        }, 10);
        setTimeout(() => {
          broadcastStatus({
            run_id: lastRunId,
            status: "tool_done",
            tool_call_id: "call-1",
            ok: true
          });
          broadcastStatus({
            run_id: lastRunId,
            status: "paused"
          });
        }, 75);
        return;
      }

      if (request.action === "AgentResume") {
        respond({ run_id: lastRunId, status: "running" });
        setTimeout(() => {
          broadcastStatus({
            run_id: lastRunId,
            status: "running"
          });
        }, 10);
        setTimeout(() => {
          broadcastResult({
            run_id: lastRunId,
            status: "completed",
            final_answer: "Resumed after manual takeover."
          });
        }, 80);
        return;
      }

      if (request.action === "AgentStop") {
        respond({ run_id: lastRunId, status: "stopped" });
        setTimeout(() => {
          broadcastResult({
            run_id: lastRunId,
            status: "stopped"
          });
        }, 25);
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
      await withTimeout("sidecar SSE connection", sseConnectionPromise, 8_000);
    },
    waitForRpcConnection: async () => {
      if (rpcConnected) {
        return;
      }
      await withTimeout("sidecar RPC connection", rpcConnectionPromise, 8_000);
    },
    waitForActionCount,
    getActions: () => [...actions],
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

describe("Panel stop state", () => {
  it("shows a stopped message instead of no response when a run is cancelled", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const sidecarStub = await startSidecarStub();
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-stop-profile-"));

    let context: Awaited<ReturnType<typeof launchManagedPersistentContext>> | null = null;
    let panelPage: Page | null = null;
    try {
      try {
        context = await launchManagedPersistentContext(profileDir, {
          channel: "chromium",
          headless: true,
          args: [
            `--disable-extensions-except=${testExtensionDir}`,
            `--load-extension=${testExtensionDir}`
          ]
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to launch Playwright Chromium. Run 'npx playwright install chromium'. ${message}`);
      }

      const extensionId = await resolveExtensionId(context, 10_000);
      panelPage = await context.newPage();
      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Start something long.");
      await panelPage.getByRole("button", { name: "Send" }).click();
      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "visible", timeout: 5_000 });

      await panelPage.getByRole("button", { name: "Send" }).click();
      await sidecarStub.waitForActionCount("AgentStop", 1);
      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "hidden", timeout: 5_000 });

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 5_000, interval: 50 }
      ).toContain("Stopped");

      const assistantText = await panelPage.locator(".thread-msg.assistant .msg-content").last().innerText();
      expect(assistantText).not.toContain("No response");
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "panel-stop-failure.png"));
      throw error;
    } finally {
      if (context) {
        await context.close();
      }
      await sidecarStub.close();
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(testExtensionDir, { recursive: true, force: true });
    }
  }, 30_000);

  it("shows pausing then paused in the takeover bar and resumes the same run", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const sidecarStub = await startSidecarStub();
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-pause-profile-"));

    let context: Awaited<ReturnType<typeof launchManagedPersistentContext>> | null = null;
    let panelPage: Page | null = null;
    try {
      try {
        context = await launchManagedPersistentContext(profileDir, {
          channel: "chromium",
          headless: true,
          args: [
            `--disable-extensions-except=${testExtensionDir}`,
            `--load-extension=${testExtensionDir}`
          ]
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to launch Playwright Chromium. Run 'npx playwright install chromium'. ${message}`);
      }

      const targetPage = await context.newPage();
      await withTimeout("fixture goto", targetPage.goto(`${sidecarStub.origin}/fixture`), 10_000);
      expect(await targetPage.locator("body").innerText()).toContain("Fixture page");

      const extensionId = await resolveExtensionId(context, 10_000);
      panelPage = await context.newPage();
      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Keep browsing for me.");
      await panelPage.getByRole("button", { name: "Send" }).click();

      await targetPage.locator("#atlas-bar").waitFor({ state: "visible", timeout: 5_000 });
      await targetPage.getByRole("button", { name: "Take control" }).click();

      await sidecarStub.waitForActionCount("AgentPause", 1);
      await expect.poll(
        async () => targetPage.locator("#atlas-bar-status").innerText(),
        { timeout: 3_000, interval: 50 }
      ).toContain("Pausing");

      await targetPage.getByRole("button", { name: "Resume" }).waitFor({ state: "visible", timeout: 5_000 });
      expect(await targetPage.locator("#atlas-bar-status").innerText()).toContain("Paused");

      await targetPage.getByRole("button", { name: "Resume" }).click();
      await sidecarStub.waitForActionCount("AgentResume", 1);

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 4_000, interval: 50 }
      ).toContain("Resumed after manual takeover");

      expect(sidecarStub.getActions().filter((action) => action === "AgentRun")).toHaveLength(1);
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "panel-pause-failure.png"));
      throw error;
    } finally {
      if (context) {
        await context.close();
      }
      await sidecarStub.close();
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(testExtensionDir, { recursive: true, force: true });
    }
  }, 25_000);
});
