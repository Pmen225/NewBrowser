import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
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
const DOC_PATH = path.join(ROOT, "docs", "testing", "funnels", "comet-transcript-funnels.md");
const EXTENSION_PATH = path.join(ROOT, "extension");

const FUNNELS = [
  {
    id: "email-triage",
    pagePath: "/email-inbox",
    prompt: "Please find important unanswered emails from this inbox.",
    expectedAnswer: "Found 3 important unanswered emails that still need a reply."
  },
  {
    id: "unsubscribe-spam",
    pagePath: "/email-promotions",
    prompt: "Please unsubscribe me from anything that looks like spam or is not important.",
    expectedAnswer: "Unsubscribed from 4 promotional senders and left priority mail untouched."
  },
  {
    id: "conversion-audit",
    pagePath: "/product-page",
    prompt: "Please give me ideas to increase the conversion rate on this page and raise average order value.",
    expectedAnswer: "Add a bundle upsell near add to cart and tighten the offer hierarchy above the fold."
  },
  {
    id: "tab-recovery",
    pagePath: "/workspace-tabs",
    prompt: "Please tell me what I was doing in these tabs and suggest which ones I should close.",
    expectedAnswer: "Keep checkout and research open, close 3 completed comparison tabs."
  }
] as const;

function readText(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function renderFixturePage(title: string, heading: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${heading}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;
}

const FIXTURE_HTML: Record<string, string> = {
  "/email-inbox": renderFixturePage(
    "Inbox Review",
    "Important unanswered emails",
    "Support, client, and recruiting messages are waiting for replies."
  ),
  "/email-promotions": renderFixturePage(
    "Promotions",
    "Promotional inbox cleanup",
    "Newsletter, promo code, and marketing emails are available for unsubscribe actions."
  ),
  "/product-page": renderFixturePage(
    "Product Audit",
    "Ice cream shorts product page",
    "Primary CTA, product copy, and add-to-cart hierarchy can be reviewed for conversion and AOV."
  ),
  "/workspace-tabs": renderFixturePage(
    "Workspace Tabs",
    "Open work summary",
    "Shopping, research, and checkout tabs are open and can be summarised or closed."
  )
};

interface StartedServer {
  origin: string;
  waitForEventStream: () => Promise<void>;
  waitForRpcConnection: () => Promise<void>;
  waitForAgentRuns: (count: number) => Promise<void>;
  getActions: () => string[];
  close: () => Promise<void>;
}

function prepareTestExtension(sidecarOrigin: string): string {
  const tempExtensionDir = mkdtempSync(path.join(tmpdir(), "new-browser-funnels-extension-"));
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

function buildAnswerFromPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("important unanswered emails")) {
    return FUNNELS[0].expectedAnswer;
  }
  if (normalized.includes("unsubscribe") || normalized.includes("spam")) {
    return FUNNELS[1].expectedAnswer;
  }
  if (normalized.includes("conversion rate") || normalized.includes("average order value")) {
    return FUNNELS[2].expectedAnswer;
  }
  if (normalized.includes("what i was doing in these tabs") || normalized.includes("suggest which ones i should close")) {
    return FUNNELS[3].expectedAnswer;
  }
  return "Done";
}

async function startFixtureServer(): Promise<StartedServer> {
  const server = createServer((request, response) => {
    const page = FIXTURE_HTML[request.url ?? ""];
    if (!page) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(page);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start fixture server");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    waitForEventStream: async () => {},
    waitForRpcConnection: async () => {},
    waitForAgentRuns: async () => {},
    getActions: () => [],
    close: async () => {
      server.close();
      await once(server, "close");
    }
  };
}

async function startSidecarStub(): Promise<StartedServer> {
  const sseClients = new Set<ServerResponse>();
  const runs = new Map<string, { finalAnswer: string }>();
  const actionLog: string[] = [];
  let agentRunCount = 0;
  let runOrdinal = 0;
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

  function broadcastResult(runId: string, finalAnswer: string): void {
    const data = JSON.stringify({
      payload: {
        run_id: runId,
        final_answer: finalAnswer
      }
    });

    for (const client of sseClients) {
      client.write(`event: result\n`);
      client.write(`data: ${data}\n\n`);
    }
  }

  function broadcastStatus(runId: string): void {
    const data = JSON.stringify({
      payload: {
        run_id: runId
      }
    });

    for (const client of sseClients) {
      client.write(`event: status\n`);
      client.write(`data: ${data}\n\n`);
    }
  }

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
      actionLog.push(request.action);

      const respond = (result: unknown) => {
        socket.send(
          JSON.stringify({
            request_id: request.request_id,
            ok: true,
            result
          })
        );
      };

      if (request.action === "SetActiveTab") {
        respond({ tab_id: "tab-runtime-1" });
        return;
      }

      if (request.action === "ProviderCatalogGet") {
        respond({
          provider: "google",
          models: [
            {
              id: "gemini-2.5-flash",
              display_name: "Gemini 2.5 Flash",
              supports_browser_search: true
            }
          ]
        });
        return;
      }

      if (request.action === "AgentRun") {
        runOrdinal += 1;
        agentRunCount += 1;
        const runId = `run-${runOrdinal}`;
        const prompt = typeof request.params?.prompt === "string" ? request.params.prompt : "";
        const finalAnswer = buildAnswerFromPrompt(prompt);
        runs.set(runId, { finalAnswer });
        respond({ run_id: runId });
        setTimeout(() => {
          broadcastStatus(runId);
          broadcastResult(runId, finalAnswer);
        }, 50);
        return;
      }

      if (request.action === "AgentGetState") {
        const runId = typeof request.params?.run_id === "string" ? request.params.run_id : "";
        const run = runs.get(runId);
        respond({
          run_id: runId,
          status: "completed",
          steps: [],
          sources: [],
          final_answer: run?.finalAnswer ?? "Done"
        });
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
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
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
    waitForAgentRuns,
    getActions: () => actionLog.slice(),
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

async function seedUnlockedProviders(panelPage: Page): Promise<void> {
  await panelPage.evaluate(async () => {
    const storageKey = "ui.session.unlockedProviders";
    const unlockedProviders = {
      google: {
        provider: "google",
        apiKey: "test-google-key",
        baseUrl: "",
        preferredModel: "gemini-2.5-flash",
        unlockedAt: new Date().toISOString()
      },
      openai: {
        provider: "openai",
        apiKey: "test-openai-key",
        baseUrl: "",
        preferredModel: "gpt-4.1-mini",
        unlockedAt: new Date().toISOString()
      }
    };

    const setIfAvailable = async (area: chrome.storage.StorageArea | undefined) => {
      if (!area) {
        return;
      }
      await area.set({
        [storageKey]: unlockedProviders
      });
    };

    await setIfAvailable(globalThis.chrome?.storage?.session);
    await setIfAvailable(globalThis.chrome?.storage?.local);
  });
}

describe("Comet transcript browser funnels", () => {
  it("documents the transcript funnels and exposes a dedicated command", () => {
    const rootPackage = JSON.parse(readText("package.json"));

    expect(rootPackage.scripts["test:funnels"]).toBe(
      "vitest run --config vitest.funnels.config.ts"
    );
    expect(existsSync(DOC_PATH), "Missing funnel doc").toBe(true);

    if (existsSync(DOC_PATH)) {
      const doc = readFileSync(DOC_PATH, "utf8");
      expect(doc).toContain("email-triage");
      expect(doc).toContain("unsubscribe-spam");
      expect(doc).toContain("conversion-audit");
      expect(doc).toContain("tab-recovery");
      expect(doc).toContain("Human Path Only");
    }
  });

  it("runs the transcript funnels through the real extension panel UI", async () => {
    expect(existsSync(DOC_PATH), "Missing funnel doc").toBe(true);
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const fixtureServer = await startFixtureServer();
    const sidecarStub = await startSidecarStub();
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);

    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-funnels-profile-"));
    const screenshotDir = mkdtempSync(path.join(tmpdir(), "new-browser-funnels-shots-"));

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
      const fixturePage = await context.newPage();
      panelPage = await context.newPage();

      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });
      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      for (const funnel of FUNNELS) {
        await seedUnlockedProviders(panelPage);
        await withTimeout(`fixture goto ${funnel.id}`, fixturePage.goto(`${fixtureServer.origin}${funnel.pagePath}`), 10_000);
        await panelPage.getByLabel("Ask anything").fill(funnel.prompt);
        await panelPage.getByRole("button", { name: "Send" }).click();
        try {
          await sidecarStub.waitForAgentRuns(FUNNELS.indexOf(funnel) + 1);
        } catch (error) {
          const debugState = await panelPage.evaluate(() => {
            const prompt = (document.getElementById("prompt-input") as HTMLInputElement | null)?.value ?? "";
            const messages = Array.from(document.querySelectorAll(".thread-msg .msg-content")).map((node) => node.textContent ?? "");
            return { prompt, messages };
          });
          throw new Error(
            `No AgentRun observed. Actions: ${sidecarStub.getActions().join(", ")}. ` +
              `Panel state: ${JSON.stringify(debugState)}. ` +
              `Root error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        await panelPage.getByText(funnel.expectedAnswer, { exact: true }).waitFor({ state: "visible" });

        const screenshotPath = path.join(screenshotDir, `${funnel.id}.png`);
        await panelPage.screenshot({ path: screenshotPath });
        expect(existsSync(screenshotPath), `Missing screenshot for ${funnel.id}`).toBe(true);
      }
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "comet-transcript-failure.png"));
      throw error;
    } finally {
      if (context) {
        await context.close();
      }
      await sidecarStub.close();
      await fixtureServer.close();
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(screenshotDir, { recursive: true, force: true });
      rmSync(testExtensionDir, { recursive: true, force: true });
    }
  }, 60_000);
});
