import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "playwright";
import { WebSocketServer } from "ws";
import { describe, expect, it } from "vitest";

import { listenWithLoopbackGuard } from "../../../scripts/lib/loopback-bind.js";
import {
  launchManagedPersistentContext,
  resolveExtensionId,
  safePageScreenshot,
  withTimeout
} from "../helpers/runtime-guards";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const EXTENSION_PATH = path.join(ROOT, "extension");
const ARTIFACT_DIR = path.join(ROOT, "output", "playwright", "panel-stop-state");

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

async function seedPanelSettings(
  panelPage: Page,
  overrides: {
    browserAdminEnabled?: boolean;
    localShellEnabled?: boolean;
    extensionManagementEnabled?: boolean;
  } = {}
): Promise<void> {
  await panelPage.evaluate(async (nextSettings) => {
    const storageKey = "ui.panelSettings";
    const baseSettings = {
      browserAdminEnabled: false,
      localShellEnabled: false,
      extensionManagementEnabled: false
    };

    const setIfAvailable = async (area: chrome.storage.StorageArea | undefined) => {
      if (!area) {
        return;
      }
      await area.set({
        [storageKey]: {
          ...baseSettings,
          ...nextSettings
        }
      });
    };

    await setIfAvailable(globalThis.chrome?.storage?.local);
  }, overrides);
}

async function captureArtifact(page: Page | null, filename: string): Promise<string> {
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  await safePageScreenshot(page, artifactPath);
  expect(existsSync(artifactPath), `Missing screenshot artifact ${filename}`).toBe(true);
  return artifactPath;
}

interface SidecarStub {
  origin: string;
  waitForRpcConnection: () => Promise<void>;
  waitForEventStream: () => Promise<void>;
  waitForActionCount: (action: string, count: number) => Promise<void>;
  getActions: () => string[];
  getRequests: () => Array<{ action: string; params: Record<string, unknown> | null }>;
  close: () => Promise<void>;
}

type SidecarScenario = "default" | "navigate-complete" | "interrupted";

async function startSidecarStub(scenario: SidecarScenario = "default"): Promise<SidecarStub> {
  const sseClients = new Set<ServerResponse>();
  const actions: string[] = [];
  const actionCounts = new Map<string, number>();
  const requests: Array<{ action: string; params: Record<string, unknown> | null }> = [];
  let lastRunId = "run-1";
  let lastKnownStatus = "idle";
  let lastFinalAnswer = "";
  let lastErrorMessage = "";
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
    if (typeof payload.status === "string") {
      lastKnownStatus = payload.status;
    }
    if (typeof payload.final_answer === "string") {
      lastFinalAnswer = payload.final_answer;
    }
    if (typeof payload.error_message === "string") {
      lastErrorMessage = payload.error_message;
    }
    const data = JSON.stringify({ payload });
    for (const client of sseClients) {
      client.write("event: result\n");
      client.write(`data: ${data}\n\n`);
    }
  }

  function broadcastStatus(payload: Record<string, unknown>): void {
    if (typeof payload.status === "string" && payload.status !== "tool_start" && payload.status !== "tool_done") {
      lastKnownStatus = payload.status;
    }
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
        params?: Record<string, unknown>;
      };
      actions.push(request.action);
      requests.push({
        action: request.action,
        params: request.params && typeof request.params === "object" ? request.params : null
      });
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
        lastKnownStatus = "running";
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
        if (scenario === "navigate-complete") {
          setTimeout(() => {
            broadcastResult({
              run_id: lastRunId,
              status: "completed",
              final_answer: "Opened Wikipedia."
            });
          }, 90);
        }
        if (scenario === "interrupted") {
          setTimeout(() => {
            broadcastResult({
              run_id: lastRunId,
              status: "interrupted",
              error_message: "Request was aborted"
            });
          }, 90);
        }
        return;
      }

      if (request.action === "AgentPause") {
        respond({ run_id: lastRunId, status: "pausing" });
        lastKnownStatus = "pausing";
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
        lastKnownStatus = "running";
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
        lastKnownStatus = "stopped";
        setTimeout(() => {
          broadcastResult({
            run_id: lastRunId,
            status: "stopped"
          });
        }, 25);
        return;
      }

      if (request.action === "AgentGetState") {
        respond({
          run_id: lastRunId,
          status: lastKnownStatus,
          ...(lastFinalAnswer ? { final_answer: lastFinalAnswer } : {}),
          ...(lastErrorMessage ? { error_message: lastErrorMessage } : {})
        });
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

  await listenWithLoopbackGuard(httpServer, {
    host: "127.0.0.1",
    port: 0,
    label: "panel stop-state sidecar stub"
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
    getRequests: () => requests.map((entry) => ({ action: entry.action, params: entry.params ? { ...entry.params } : null })),
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
      await seedUnlockedProviders(panelPage);

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Start something long.");
      await panelPage.getByRole("button", { name: "Send" }).click();
      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "visible", timeout: 5_000 });
      await captureArtifact(panelPage, "stop-running.png");

      await panelPage.getByRole("button", { name: "Send" }).click();
      await sidecarStub.waitForActionCount("AgentStop", 1);
      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "hidden", timeout: 5_000 });

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 5_000, interval: 50 }
      ).toContain("Stopped");

      const assistantText = await panelPage.locator(".thread-msg.assistant .msg-content").last().innerText();
      expect(assistantText).not.toContain("No response");
      await captureArtifact(panelPage, "stop-stopped.png");
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

  it("shows pausing in the overlay and resumes the same run from the panel", async () => {
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
      await seedUnlockedProviders(panelPage);

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

      await panelPage.getByRole("button", { name: "Resume" }).waitFor({ state: "visible", timeout: 5_000 });
      expect(await targetPage.locator("#atlas-bar-status").innerText()).toContain("Paused");
      await captureArtifact(panelPage, "pause-paused.png");

      await panelPage.getByRole("button", { name: "Resume" }).click();
      await sidecarStub.waitForActionCount("AgentResume", 1);

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 4_000, interval: 50 }
      ).toContain("Resumed after manual takeover");

      expect(sidecarStub.getActions().filter((action) => action === "AgentRun")).toHaveLength(1);
      await captureArtifact(panelPage, "pause-resumed.png");
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

  it("finishes a simple navigation run and returns the panel to idle", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const sidecarStub = await startSidecarStub("navigate-complete");
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-navigation-profile-"));

    let context: Awaited<ReturnType<typeof launchManagedPersistentContext>> | null = null;
    let panelPage: Page | null = null;
    try {
      context = await launchManagedPersistentContext(profileDir, {
        channel: "chromium",
        headless: true,
        args: [
          `--disable-extensions-except=${testExtensionDir}`,
          `--load-extension=${testExtensionDir}`
        ]
      });

      const extensionId = await resolveExtensionId(context, 10_000);
      panelPage = await context.newPage();
      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });
      await seedUnlockedProviders(panelPage);

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Go to Wikipedia.");
      await panelPage.getByRole("button", { name: "Send" }).click();
      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "visible", timeout: 5_000 });
      await expect(panelPage.locator(".message--assistant-thinking .thinking-status-row .thinking-copy")).toHaveCount(1);
      await expect(panelPage.locator(".message--assistant-thinking .thinking-control-btn")).toHaveCount(2);
      await captureArtifact(panelPage, "navigation-running.png");

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 5_000, interval: 50 }
      ).toContain("Opened Wikipedia.");

      await panelPage.locator("#btn-send.stop-mode").waitFor({ state: "hidden", timeout: 5_000 });
      await captureArtifact(panelPage, "navigation-completed.png");
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "panel-navigation-failure.png"));
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

  it("renders interrupted runs as neutral interruptions instead of fatal error slabs", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const sidecarStub = await startSidecarStub("interrupted");
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-interrupted-profile-"));

    let context: Awaited<ReturnType<typeof launchManagedPersistentContext>> | null = null;
    let panelPage: Page | null = null;
    try {
      context = await launchManagedPersistentContext(profileDir, {
        channel: "chromium",
        headless: true,
        args: [
          `--disable-extensions-except=${testExtensionDir}`,
          `--load-extension=${testExtensionDir}`
        ]
      });

      const extensionId = await resolveExtensionId(context, 10_000);
      panelPage = await context.newPage();
      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });
      await seedUnlockedProviders(panelPage);

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      await panelPage.getByLabel("Ask anything").fill("Go to Wikipedia.");
      await panelPage.getByRole("button", { name: "Send" }).click();

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 5_000, interval: 50 }
      ).toContain("interrupted before it finished");

      expect(await panelPage.locator(".gamma-error").count()).toBe(0);
      await captureArtifact(panelPage, "interrupted-neutral.png");
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "panel-interrupted-failure.png"));
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

  it("allows explicit admin-portal runs through the panel when browser admin is enabled", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Missing built extension").toBe(true);

    const sidecarStub = await startSidecarStub("navigate-complete");
    const testExtensionDir = prepareTestExtension(sidecarStub.origin);
    const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-admin-profile-"));

    let context: Awaited<ReturnType<typeof launchManagedPersistentContext>> | null = null;
    let panelPage: Page | null = null;
    try {
      context = await launchManagedPersistentContext(profileDir, {
        channel: "chromium",
        headless: true,
        args: [
          `--disable-extensions-except=${testExtensionDir}`,
          `--load-extension=${testExtensionDir}`
        ]
      });

      const extensionId = await resolveExtensionId(context, 10_000);
      panelPage = await context.newPage();
      await withTimeout("panel goto", panelPage.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
      await panelPage.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });
      await seedUnlockedProviders(panelPage);
      await seedPanelSettings(panelPage, { browserAdminEnabled: true });

      await sidecarStub.waitForRpcConnection();
      await sidecarStub.waitForEventStream();

      const prompt = "Activate the visible Azure roles except Security Reader.";
      await panelPage.getByLabel("Ask anything").fill(prompt);
      await panelPage.getByRole("button", { name: "Send" }).click();
      await sidecarStub.waitForActionCount("AgentRun", 1);

      const [runRequest] = sidecarStub.getRequests().filter((entry) => entry.action === "AgentRun");
      expect(runRequest?.params?.prompt).toBe(prompt);
      expect(runRequest?.params?.allow_browser_admin_pages).toBe(true);

      await expect.poll(
        async () => panelPage.locator(".thread-msg.assistant .msg-content").last().innerText(),
        { timeout: 5_000, interval: 50 }
      ).toContain("Opened Wikipedia.");

      await captureArtifact(panelPage, "admin-allowed.png");
    } catch (error) {
      await safePageScreenshot(panelPage, path.join(ROOT, "output", "playwright", "funnels-debug", "panel-admin-failure.png"));
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
