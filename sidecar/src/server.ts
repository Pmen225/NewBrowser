import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { writeFile } from "node:fs/promises";
import { access, constants, mkdir } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";

import { waitForNavigation } from "../../src/cdp/wait-primitives";
import { FrameRegistry } from "../../src/cdp/frame-registry";
import { SessionRegistry } from "../../src/cdp/session-registry";
import { TargetEventRouter } from "../../src/cdp/target-event-router";
import type { BrowserActionRuntime } from "../../src/cdp/browser-actions";
import type { CdpClient } from "../../src/sidecar/read-page/types";
import {
  createRpcError,
  createRpcSuccess,
  isRecord,
  parseRpcRequest,
  type JsonObject
} from "../../shared/src/transport";
import { createSseHub } from "./http/events";
import { createTraceLogger, type TraceLogger } from "./observability/trace-logger";
import { launchBrowser, type BrowserDiscoveryPolicy, type BrowserLaunchResult } from "./browser/launcher";
import { createOrchestrator } from "./agent/orchestrator";
import { loadPromptSpecs } from "./agent/prompt-loader";
import { enforceUserFacingResponsePayload } from "./policy/response-validator";
import { createProviderRegistry } from "./llm/provider-registry";
import { createProviderStateService } from "./llm/provider-state";
import { createBrowserControlBenchmarkRunner } from "./bench/browser-model-benchmark";
import { createActiveTabDispatcher } from "./rpc/active-tab-dispatcher";
import { createBrowserActionDispatcher } from "./rpc/browser-action-dispatcher";
import { createFindDispatcher } from "./rpc/find-dispatcher";
import { createGetPageTextDispatcher } from "./rpc/get-page-text-dispatcher";
import { createSearchWebDispatcher } from "./rpc/search-web-dispatcher";
import { createSystemDispatcher } from "./rpc/system-dispatcher";
import { createTodoDispatcher } from "./rpc/todo-dispatcher";
import { createExecutionTargetResolver } from "./rpc/execution-target";
import { executeWithReliability } from "./rpc/reliability";
import { resolveRuntimeTabState } from "./runtime-tab-state";
import {
  createBlockedDomainsGuard,
  createActionPolicyGuard,
  type ActionDispatcher,
  createComposedDispatcher,
  createPingDispatcher,
  createReadPageDispatcher,
  createSafetyPermissionGuard
} from "./rpc/dispatcher";
import { createRpcWebSocketServer } from "./ws/rpcServer";
import { ChromeCdpTransport } from "./cdp/chrome-cdp-transport";
import { detectExtensionPresence, resolveDefaultChromeProfileRoot } from "./extension-presence";
import {
  groupTabsViaExtensionContext,
  navigateSensitiveTabViaExtensionContext,
  ungroupTabsViaExtensionContext
} from "./cdp/extension-tab-groups";
import { manageExtensionsViaExtensionContext } from "./cdp/extension-management";
import { BrowserActionError } from "../../src/cdp/browser-actions";

interface TargetInfoLike {
  targetId: string;
  type: string;
  url: string;
  title?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

interface LaunchConfig {
  host: string;
  port: number;
  rpcPath: string;
  eventsPath: string;
  traceDir: string;
  browserPolicy: BrowserDiscoveryPolicy;
  extensionLoaded: boolean;
  cdpWsUrl?: string;
  allowedOrigins?: string[];
}

function parseAgentMaxSteps(value: string | undefined): number {
  if (!value) {
    return 50;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(parsed, 250);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllowedOrigins(raw: string | undefined): string[] | undefined {
  if (!raw || raw.trim().length === 0 || raw.trim() === "*") {
    return undefined;
  }
  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return parsed.length > 0 ? parsed : undefined;
}

function parseBrowserPolicy(raw: string | undefined): BrowserDiscoveryPolicy {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "prefer_ungoogled") {
    return "prefer_ungoogled";
  }
  if (normalized === "any_chromium") {
    return "any_chromium";
  }
  return "ungoogled_only";
}

const debugStartup = process.env.SIDECAR_DEBUG_STARTUP === "1";
const startupStatePath = process.env.SIDECAR_STARTUP_STATE_PATH?.trim() || "";

function startupLog(message: string): void {
  if (debugStartup) {
    console.log(`[startup] ${message}`);
  }
}

async function writeStartupState(phase: string, detail?: string): Promise<void> {
  if (!startupStatePath) {
    return;
  }

  try {
    await writeFile(
      startupStatePath,
      JSON.stringify(
        {
          phase,
          detail: typeof detail === "string" && detail.trim().length > 0 ? detail : undefined,
          ts: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch {
    // Ignore startup-state telemetry write failures.
  }
}

async function reserveLoopbackPort(preferredPort: number): Promise<number> {
  const tryListen = (port: number): Promise<number> =>
    new Promise<number>((resolvePort, rejectPort) => {
      const server = createNetServer();
      const finalize = (callback: () => void): void => {
        server.close(() => {
          callback();
        });
      };

      server.once("error", (error) => {
        if ((error as NodeJS.ErrnoException).code === "EADDRINUSE" && port !== 0) {
          resolvePort(-1);
          return;
        }
        rejectPort(error);
      });

      server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          finalize(() => rejectPort(new Error("Failed to resolve reserved port")));
          return;
        }
        finalize(() => resolvePort(address.port));
      });
    });

  const preferred = await tryListen(preferredPort);
  if (preferred > 0) {
    return preferred;
  }

  return tryListen(0);
}

async function resolveCdpWebSocketUrl(): Promise<string | undefined> {
  if (process.env.CHROME_CDP_WS_URL && process.env.CHROME_CDP_WS_URL.trim().length > 0) {
    return process.env.CHROME_CDP_WS_URL.trim();
  }

  const host = process.env.CHROME_CDP_HOST ?? "127.0.0.1";
  const port = process.env.CHROME_CDP_PORT ?? "9222";
  const versionUrl = process.env.CHROME_CDP_HTTP_URL?.trim() || `http://${host}:${port}/json/version`;

  try {
    const response = await fetch(versionUrl);
    if (!response.ok) {
      return undefined;
    }
    const payload = (await response.json()) as { webSocketDebuggerUrl?: unknown };
    if (typeof payload.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0) {
      return payload.webSocketDebuggerUrl;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function createConfig(
  cdpWsUrl: string | undefined,
  browserPolicy: BrowserDiscoveryPolicy,
  extensionLoaded: boolean
): LaunchConfig {
  const traceDir = process.env.SIDECAR_TRACE_DIR?.trim() || ".sidecar-traces";
  return {
    host: process.env.SIDECAR_HOST?.trim() || "127.0.0.1",
    port: parseNumber(process.env.SIDECAR_PORT, 3210),
    rpcPath: process.env.SIDECAR_RPC_PATH?.trim() || "/rpc",
    eventsPath: process.env.SIDECAR_EVENTS_PATH?.trim() || "/events",
    traceDir,
    browserPolicy,
    extensionLoaded,
    cdpWsUrl,
    allowedOrigins: parseAllowedOrigins(process.env.SIDECAR_ALLOWED_ORIGINS)
  };
}

async function pathExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExtensionPath(): Promise<string | undefined> {
  const fromEnv = process.env.NEW_BROWSER_EXTENSION_PATH?.trim() || process.env.COMET_EXTENSION_PATH?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const localExtensionPath = resolve(process.cwd(), "extension");
  if (await pathExists(localExtensionPath)) {
    return localExtensionPath;
  }

  return undefined;
}

function isMissingSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /session with given id not found/i.test(error.message);
}

async function recoverTabSession(sessionRegistry: SessionRegistry, tabId: string): Promise<void> {
  await sessionRegistry.reattachTab(tabId);
  await sessionRegistry.enableDomains(tabId);
  await sessionRegistry.refreshFrameTree(tabId);
}

async function withTabSessionRecovery<T>(
  sessionRegistry: SessionRegistry,
  tabId: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isMissingSessionError(error)) {
      throw error;
    }

    await recoverTabSession(sessionRegistry, tabId);
    return operation();
  }
}

function resolveSessionForFrame(
  sessionRegistry: SessionRegistry,
  tabId: string,
  fallbackSessionId: string,
  frameId?: string
): string {
  if (!frameId) {
    return fallbackSessionId;
  }

  try {
    return sessionRegistry.route(tabId, frameId).sessionId;
  } catch {
    return fallbackSessionId;
  }
}

function createReadPageClientForTab(
  transport: ChromeCdpTransport,
  sessionRegistry: SessionRegistry,
  tabId: string
): CdpClient | undefined {
  if (!sessionRegistry.getTab(tabId)) {
    return undefined;
  }

  return {
    Page: {
      getFrameTree: () =>
        withTabSessionRecovery(sessionRegistry, tabId, async () => {
          const tab = sessionRegistry.getTab(tabId);
          if (!tab) {
            throw new Error(`Tab ${tabId} is not registered`);
          }

          return transport.send("Page.getFrameTree", {}, tab.sessionId);
        })
    },
    DOMSnapshot: {
      captureSnapshot: (params) =>
        withTabSessionRecovery(sessionRegistry, tabId, async () => {
          const tab = sessionRegistry.getTab(tabId);
          if (!tab) {
            throw new Error(`Tab ${tabId} is not registered`);
          }

          const sessionId = resolveSessionForFrame(sessionRegistry, tabId, tab.sessionId, params.frameId);
          return transport.send("DOMSnapshot.captureSnapshot", params, sessionId);
        })
    },
    Accessibility: {
      getFullAXTree: (params) =>
        withTabSessionRecovery(sessionRegistry, tabId, async () => {
          const tab = sessionRegistry.getTab(tabId);
          if (!tab) {
            throw new Error(`Tab ${tabId} is not registered`);
          }

          const sessionId = resolveSessionForFrame(sessionRegistry, tabId, tab.sessionId, params.frameId);
          return transport.send("Accessibility.getFullAXTree", params, sessionId);
        })
    },
    DOM: {
      getFrameOwner: (params) =>
        withTabSessionRecovery(sessionRegistry, tabId, async () => {
          const tab = sessionRegistry.getTab(tabId);
          if (!tab) {
            throw new Error(`Tab ${tabId} is not registered`);
          }

          return transport.send("DOM.getFrameOwner", params, tab.sessionId);
        })
    }
  };
}

function createBrowserRuntime(transport: ChromeCdpTransport, sessionRegistry: SessionRegistry): BrowserActionRuntime {
  return {
    send: transport.send.bind(transport),
    route: sessionRegistry.route.bind(sessionRegistry),
    routeByFrameOrdinal: sessionRegistry.routeByFrameOrdinal.bind(sessionRegistry),
    getTab: sessionRegistry.getTab.bind(sessionRegistry),
    listTabs: sessionRegistry.listTabs.bind(sessionRegistry),
    getJavaScriptDialog: sessionRegistry.getJavaScriptDialog.bind(sessionRegistry),
    clearJavaScriptDialog: sessionRegistry.clearJavaScriptDialogForTab.bind(sessionRegistry),
    groupTabs: async (tabIds, options) => {
      const targets = tabIds.map((tabId) => {
        const tab = sessionRegistry.getTab(tabId);
        if (!tab) {
          throw new BrowserActionError("TAB_NOT_FOUND", `Tab ${tabId} is not registered`, false, {
            tab_id: tabId
          });
        }
        return {
          tabId,
          targetId: tab.targetId,
          chromeTabId: tab.chromeTabId
        };
      });
      return groupTabsViaExtensionContext(transport, targets, options);
    },
    ungroupTabs: async (tabIds) => {
      const targets = tabIds.map((tabId) => {
        const tab = sessionRegistry.getTab(tabId);
        if (!tab) {
          throw new BrowserActionError("TAB_NOT_FOUND", `Tab ${tabId} is not registered`, false, {
            tab_id: tabId
          });
        }
        return {
          tabId,
          targetId: tab.targetId,
          chromeTabId: tab.chromeTabId
        };
      });
      return ungroupTabsViaExtensionContext(transport, targets);
    },
    manageExtensions: async (params) => manageExtensionsViaExtensionContext(transport, params),
    navigateSensitivePage: async (tabId, url) => {
      const tab = sessionRegistry.getTab(tabId);
      if (!tab) {
        throw new BrowserActionError("TAB_NOT_FOUND", `Tab ${tabId} is not registered`, false, {
          tab_id: tabId
        });
      }
      const result = await navigateSensitiveTabViaExtensionContext(transport, {
        tabId,
        targetId: tab.targetId,
        chromeTabId: tab.chromeTabId
      }, url);
      if (result.chromeTabId >= 0) {
        sessionRegistry.bindChromeTabId(tabId, result.chromeTabId);
      }
      return result;
    },
    attachTab: sessionRegistry.attachTab.bind(sessionRegistry),
    enableDomains: sessionRegistry.enableDomains.bind(sessionRegistry),
    refreshFrameTree: sessionRegistry.refreshFrameTree.bind(sessionRegistry),
    invalidateTab: sessionRegistry.invalidateTab.bind(sessionRegistry),
    waitForLoadEvent: async (sessionId: string, timeoutMs: number, signal: AbortSignal) => {
      await waitForNavigation(transport, {
        sessionId,
        timeoutMs,
        signal
      });
    }
  };
}

async function attachInitialTab(
  transport: ChromeCdpTransport,
  sessionRegistry: SessionRegistry
): Promise<string | undefined> {
  const targets = await transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
  const targetInfos = targets.targetInfos ?? [];

  // Comet isInternalPage equivalent: prefer real web content tabs over extension/internal pages.
  // Extension pages (chrome-extension://) cannot be navigated by the agent — Chrome rejects it
  // via CDP, causing TAB_NOT_FOUND errors. Always use a real web content tab as the default.
  const isWebContent = (url: string) =>
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("chrome://") &&
    !url.startsWith("devtools://");

  const webCandidate = targetInfos.find((target) => target.type === "page" && isWebContent(target.url));

  let targetId: string | undefined;
  if (webCandidate) {
    // Found a real web content tab — use it as default
    targetId = webCandidate.targetId;
  } else {
    // Only extension/internal pages exist — create a fresh blank content tab.
    // The agent can freely navigate this tab without Chrome CDP restrictions.
    const created = await transport.send<{ targetId: string }>("Target.createTarget", {
      url: "about:blank"
    });
    targetId = created.targetId;
  }

  const tab = await sessionRegistry.attachTab(targetId);
  await sessionRegistry.enableDomains(tab.tabId);
  await sessionRegistry.refreshFrameTree(tab.tabId);
  return tab.tabId;
}

function jsonResponse(response: ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function setRpcResponseHeaders(response: ServerResponse): void {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as unknown;
}

function normalizeHttpRpcRequest(value: unknown) {
  const parsed = parseRpcRequest(value);
  if (parsed) {
    return parsed;
  }
  if (!isRecord(value)) {
    return null;
  }

  const action =
    typeof value.action === "string" && value.action.trim().length > 0
      ? value.action.trim()
      : typeof value.method === "string" && value.method.trim().length > 0
        ? value.method.trim()
        : null;
  if (!action) {
    return null;
  }

  const params = isRecord(value.params) ? value.params : {};
  const requestId =
    typeof value.request_id === "string" && value.request_id.trim().length > 0
      ? value.request_id.trim()
      : typeof value.id === "string" || typeof value.id === "number"
        ? String(value.id)
        : `http-${Date.now()}`;
  const tabId =
    typeof value.tab_id === "string" && value.tab_id.trim().length > 0
      ? value.tab_id.trim()
      : "__system__";

  return {
    request_id: requestId,
    action,
    tab_id: tabId,
    params
  };
}

function normalizeRpcError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
      details?: unknown;
    };
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        message: candidate.message,
        retryable: candidate.retryable === true,
        details: candidate.details && typeof candidate.details === "object" ? candidate.details as Record<string, unknown> : undefined
      };
    }
    if (typeof candidate.message === "string") {
      return {
        code: "INTERNAL_ERROR",
        message: candidate.message,
        retryable: false
      };
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected RPC error",
    retryable: false
  };
}

async function handleHttpRpcRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dispatcher: ActionDispatcher,
  sanitizeResult: ((action: string, result: JsonObject) => JsonObject) | undefined
): Promise<void> {
  setRpcResponseHeaders(response);

  let normalizedRequest: ReturnType<typeof normalizeHttpRpcRequest>;
  try {
    normalizedRequest = normalizeHttpRpcRequest(await readJsonBody(request));
  } catch {
    response.statusCode = 400;
    response.end(JSON.stringify(createRpcError("http-invalid-json", "INVALID_REQUEST", "Malformed JSON body", false)));
    return;
  }

  if (!normalizedRequest) {
    response.statusCode = 400;
    response.end(JSON.stringify(createRpcError("http-invalid-request", "INVALID_REQUEST", "Malformed RPC request", false)));
    return;
  }

  if (dispatcher.supports && !dispatcher.supports(normalizedRequest.action)) {
    response.statusCode = 404;
    response.end(
      JSON.stringify(createRpcError(normalizedRequest.request_id, "UNKNOWN_ACTION", `Unknown action: ${normalizedRequest.action}`, false))
    );
    return;
  }

  const controller = new AbortController();
  request.once("close", () => {
    controller.abort();
  });

  try {
    const result = await dispatcher.dispatch(normalizedRequest.action, normalizedRequest.tab_id, normalizedRequest.params, controller.signal);
    const safeResult = sanitizeResult ? sanitizeResult(normalizedRequest.action, result) : result;
    response.statusCode = 200;
    response.end(JSON.stringify(createRpcSuccess(normalizedRequest.request_id, safeResult)));
  } catch (error) {
    const normalizedError = normalizeRpcError(error);
    response.statusCode = normalizedError.code === "UNKNOWN_ACTION" ? 404 : 500;
    response.end(
      JSON.stringify(
        createRpcError(
          normalizedRequest.request_id,
          normalizedError.code,
          normalizedError.message,
          normalizedError.retryable,
          normalizedError.details
        )
      )
    );
  }
}

async function start(): Promise<void> {
  await writeStartupState("boot");
  const defaultAgentMaxSteps = parseAgentMaxSteps(process.env.AGENT_MAX_STEPS);
  let launchedBrowser: BrowserLaunchResult | undefined;
  const browserPolicy = parseBrowserPolicy(process.env.NEW_BROWSER_BROWSER_POLICY ?? process.env.COMET_BROWSER_POLICY);
  const strictBrowserLaunch = browserPolicy === "ungoogled_only";
  const browserBinaryPath = process.env.NEW_BROWSER_BROWSER_BINARY?.trim() || process.env.COMET_BROWSER_BINARY?.trim() || undefined;
  let extensionLoaded = false;
  let extensionId: string | null = null;
  let extensionDetectedViaTargets = false;
  let extensionDetectionSource = "none";
  let cdpWsUrl = await resolveCdpWebSocketUrl();
  await writeStartupState("cdp_ws_resolved", cdpWsUrl ? "cdp_detected" : "no_cdp");
  const extensionPath = await resolveExtensionPath();
  const profileRoot = resolveDefaultChromeProfileRoot();

  if (!cdpWsUrl) {
    try {
      const requestedPort = parseNumber(process.env.CHROME_CDP_PORT, 9222);
      const debuggingPort =
        process.env.CHROME_CDP_PORT && process.env.CHROME_CDP_PORT.trim().length > 0
          ? requestedPort
          : await reserveLoopbackPort(0);
      launchedBrowser = await launchBrowser({
        binaryPath: browserBinaryPath,
        debuggingPort,
        userDataDir: process.env.CHROME_USER_DATA_DIR?.trim() || undefined,
        extensionPath,
        browserPolicy
      });
      cdpWsUrl = launchedBrowser.cdpWsUrl;
      extensionLoaded = launchedBrowser.extensionLoaded;
      await writeStartupState("browser_launched", cdpWsUrl);
    } catch (error) {
      if (strictBrowserLaunch) {
        throw error;
      }

      console.warn("Browser auto-launch failed; continuing in ping-only mode.");
      if (error instanceof Error) {
        console.warn(error.message);
      }
    }
  }

  const config = createConfig(cdpWsUrl, browserPolicy, extensionLoaded);
  await mkdir(resolve(config.traceDir), { recursive: true });
  const providerRegistry = createProviderRegistry();
  const providerState = createProviderStateService({
    providerRegistry,
    cachePath: process.env.SIDECAR_PROVIDER_STATE_PATH?.trim() || resolve(config.traceDir, "provider-state.json")
  });
  const benchmarkRunner = createBrowserControlBenchmarkRunner();
  void providerState.primeFromEnvironment().catch((error) => {
    console.warn("Provider catalog priming failed.");
    if (error instanceof Error) {
      console.warn(error.message);
    }
  });

  const traceLogger: TraceLogger = createTraceLogger({
    rootDir: config.traceDir
  });
  const promptSpecs = await loadPromptSpecs();
  await writeStartupState("prompt_specs_loaded");
  const sseHub = createSseHub({
    heartbeatMs: 20_000,
    sanitizeEnvelope: (envelope) => {
      if (typeof envelope.data.payload.final_answer !== "string") {
        return envelope;
      }

      return {
        ...envelope,
        data: {
          ...envelope.data,
          payload: enforceUserFacingResponsePayload("AgentGetState", envelope.data.payload)
        }
      };
    }
  });

  let transport: ChromeCdpTransport | undefined;
  let frameRegistry: FrameRegistry | undefined;
  let sessionRegistry: SessionRegistry | undefined;
  let targetRouter: TargetEventRouter | undefined;
  let defaultTabId: string | undefined;
  let activeTabId: string | undefined;
  let lastPageTabId: string | undefined;
  let executionTargetResolver: ReturnType<typeof createExecutionTargetResolver> | undefined;

  const coreDispatchers = [createPingDispatcher(), createSearchWebDispatcher(), createTodoDispatcher()];
  const getRuntimeTabState = () =>
    resolveRuntimeTabState({
      activeTabId,
      lastPageTabId,
      defaultTabId,
      tabs: sessionRegistry?.listTabs() ?? []
    });

  if (config.cdpWsUrl) {
    startupLog(`Connecting transport to ${config.cdpWsUrl}`);
    await writeStartupState("transport_connecting", config.cdpWsUrl);
    transport = new ChromeCdpTransport({
      wsUrl: config.cdpWsUrl
    });
    await transport.connect();
    startupLog("Transport connected");
    await writeStartupState("transport_connected");
    const extensionPresence = await detectExtensionPresence(transport, {
      extensionPath,
      profileRoot
    });
    extensionLoaded = extensionPresence.loaded;
    extensionId = extensionPresence.extensionId;
    extensionDetectedViaTargets = extensionPresence.targetDetected;
    extensionDetectionSource = extensionPresence.detectionSource;
    startupLog(`Extension loaded: ${String(extensionLoaded)} (${extensionDetectionSource})`);
    await writeStartupState("extension_detected", `${String(extensionLoaded)}:${extensionDetectionSource}`);
    config.extensionLoaded = extensionLoaded;
    if (!extensionLoaded) {
      console.warn("New Browser extension was not detected through targets or profile state.");
    }

    frameRegistry = new FrameRegistry();
    sessionRegistry = new SessionRegistry(transport, frameRegistry);
    targetRouter = new TargetEventRouter(transport, sessionRegistry, frameRegistry);
    targetRouter.start();
    startupLog("Target router started");
    await writeStartupState("target_router_started");

    defaultTabId = await attachInitialTab(transport, sessionRegistry);
    startupLog(`Initial tab attached: ${defaultTabId ?? "none"}`);
    await writeStartupState("initial_tab_attached", defaultTabId ?? "none");
    activeTabId = defaultTabId;
    lastPageTabId = undefined;

    const runtime = createBrowserRuntime(transport, sessionRegistry);
    executionTargetResolver = createExecutionTargetResolver({
      transport,
      sessionRegistry,
      getActiveTabId: () => getRuntimeTabState().activeTabId,
      getDefaultTabId: () => getRuntimeTabState().defaultTabId,
      getLastPageTabId: () => getRuntimeTabState().lastPageTabId,
      onResolvedPageTab: (tabId: string) => {
        lastPageTabId = tabId;
      }
    });
    void executionTargetResolver
      .describeTab(defaultTabId)
      .then((resolved) => {
        if (resolved?.kind === "page") {
          lastPageTabId = resolved.tabId;
        }
      })
      .catch(() => undefined);
    coreDispatchers.push(
      createReadPageDispatcher({
        getClientForTab: (tabId: string) =>
          createReadPageClientForTab(transport as ChromeCdpTransport, sessionRegistry as SessionRegistry, tabId),
        getDialogForTab: (tabId: string) => (sessionRegistry as SessionRegistry).getJavaScriptDialog(tabId),
        traceLogger
      }),
      createFindDispatcher({
        getClientForTab: (tabId: string) => createReadPageClientForTab(transport as ChromeCdpTransport, sessionRegistry as SessionRegistry, tabId)
      }),
      createGetPageTextDispatcher({
        getTab: (tabId: string) => (sessionRegistry as SessionRegistry).getTab(tabId),
        getDialogForTab: (tabId: string) => (sessionRegistry as SessionRegistry).getJavaScriptDialog(tabId),
        send: transport.send.bind(transport)
      }),
      createBrowserActionDispatcher({
        runtime,
        traceLogger
      }),
      createActiveTabDispatcher({
        transport,
        sessionRegistry,
        onActiveTabChanged: (tabId: string) => {
          activeTabId = tabId;
          lastPageTabId = tabId;
          void executionTargetResolver
            .describeTab(tabId)
            .then((resolved) => {
              if (resolved?.kind === "page") {
                lastPageTabId = resolved.tabId;
              }
            })
            .catch(() => undefined);
          sseHub.publish({
            event: "status",
            data: {
              type: "status",
              ts: new Date().toISOString(),
              payload: {
                active_tab_changed: true,
                tab_id: tabId
              }
            }
          });
        }
      })
    );
  }

  const coreDispatcher = createComposedDispatcher(coreDispatchers);
  const agentToolDispatcher = createActionPolicyGuard(
    createBlockedDomainsGuard(createSafetyPermissionGuard(coreDispatcher), {}),
    {
      policy: promptSpecs.policy
    }
  );
  const orchestrator = await createOrchestrator({
    promptSpecs,
    providerRegistry,
    defaultMaxSteps: defaultAgentMaxSteps,
    resolveDefaultTabId: () => getRuntimeTabState().activeTabId,
    resolveTabContext: (tabId: string) => {
      const frames = frameRegistry?.listByTab(tabId) ?? [];
      const mainFrame = frames.find((frame) => frame.isMainFrame) ?? frames[0];
      return mainFrame
        ? {
            url: mainFrame.url
          }
        : undefined;
    },
    performAction: async (action: string, tabId: string, params: Record<string, unknown>, signal: AbortSignal) => {
      let effectiveTabId = tabId;

      if (executionTargetResolver) {
        const resolved = await executionTargetResolver.resolveForAction(action, tabId, params as JsonObject);
        effectiveTabId = resolved.tabId;

        if (resolved.kind === "page") {
          lastPageTabId = resolved.tabId;
          if (resolved.recovered || !getRuntimeTabState().activeTabId) {
            activeTabId = resolved.tabId;
          }
        }
      }

      const hooks = agentToolDispatcher.getReliabilityHooks?.(action, effectiveTabId, params as JsonObject);
      const result = await executeWithReliability({
        action,
        tab_id: effectiveTabId,
        params: params as JsonObject,
        signal,
        hooks: {
          ...hooks,
          perform: ({ params: nextParams }) => agentToolDispatcher.dispatch(action, effectiveTabId, nextParams, signal)
        }
      });

      return result.result;
    },
    onRunUpdated: (state) => {
      sseHub.publish({
        event: "status",
        data: {
          type: "status",
          ts: new Date().toISOString(),
          payload: {
            agent_run_updated: true,
            run_id: state.runId,
            status: state.status
          }
        }
      });

      if (state.status === "completed" || state.status === "failed" || state.status === "stopped") {
        sseHub.publish({
          event: "result",
          data: {
            type: "result",
            ts: new Date().toISOString(),
            payload: {
              run_id: state.runId,
              status: state.status,
              final_answer: state.finalAnswer,
              draft_artifact: state.draftArtifact,
              error_message: state.errorMessage,
              content: state.finalAnswer ?? state.errorMessage,
              user_language: state.userLanguage,
              has_image_input: state.hasImageInput,
              sources: state.sources
            }
          }
        });
      }
    },
    onToolEvent: (event) => {
      sseHub.publish({
        event: "status",
        data: {
          type: "status",
          ts: new Date().toISOString(),
          payload: {
            run_id: event.run_id,
            status: event.type,
            tool_name: event.tool_name,
            tool_call_id: event.tool_call_id,
            tool_input: event.tool_input as JsonObject | undefined,
            overlay: event.overlay as JsonObject | undefined,
            ok: event.ok
          }
        }
      });
    }
  });
  startupLog("Orchestrator created");
  await writeStartupState("orchestrator_created");

  const systemDispatcher = createSystemDispatcher({
    getRuntimeState: () => {
      const tabs =
        sessionRegistry?.listTabs().map((tab) => ({
          tab_id: tab.tabId,
          target_id: tab.targetId
        })) ?? [];
      const runtimeTabState = getRuntimeTabState();

      return {
        mode: config.cdpWsUrl ? "cdp" : "ping_only",
        default_tab_id: runtimeTabState.defaultTabId,
        active_tab_id: runtimeTabState.activeTabId,
        tabs,
        browser_policy: config.browserPolicy,
        extension_loaded: config.extensionLoaded,
        extension_id: extensionId,
        extension_detection_source: extensionDetectionSource,
        extension_detected_via_targets: extensionDetectedViaTargets
      };
    },
    providerRegistry,
    providerState,
    orchestrator,
    benchmarkRunner
  });

  const baseDispatcher = createComposedDispatcher([...coreDispatchers, systemDispatcher]);
  const safetyGuarded = createSafetyPermissionGuard(baseDispatcher);
  const blockedDomainGuarded = createBlockedDomainsGuard(safetyGuarded, {});
  const dispatcher = createActionPolicyGuard(blockedDomainGuarded, {
    policy: promptSpecs.policy
  });

  const rpcServer = createRpcWebSocketServer({
    path: config.rpcPath,
    dispatcher,
    sanitizeResult: enforceUserFacingResponsePayload,
    traceLogger,
    allowedOrigins: config.allowedOrigins
  });

  const httpServer = createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = request.url?.split("?")[0] ?? "/";

    if (url === config.rpcPath && request.method === "OPTIONS") {
      setRpcResponseHeaders(response);
      response.statusCode = 204;
      response.end();
      return;
    }

    if (url === config.rpcPath && request.method === "POST") {
      void handleHttpRpcRequest(request, response, dispatcher, enforceUserFacingResponsePayload);
      return;
    }

    if (url === config.eventsPath) {
      sseHub.handleRequest(request, response);
      return;
    }

    if (url === "/health") {
      const tabs =
        sessionRegistry?.listTabs().map((tab) => ({
          tab_id: tab.tabId,
          target_id: tab.targetId
        })) ?? [];
      const runtimeTabState = getRuntimeTabState();

      jsonResponse(response, 200, {
        ok: true,
        mode: config.cdpWsUrl ? "cdp" : "ping_only",
        default_tab_id: runtimeTabState.defaultTabId,
        active_tab_id: runtimeTabState.activeTabId,
        browser_policy: config.browserPolicy,
        extension_loaded: config.extensionLoaded,
        extension_id: extensionId,
        extension_detection_source: extensionDetectionSource,
        extension_detected_via_targets: extensionDetectedViaTargets,
        rpc_path: config.rpcPath,
        events_path: config.eventsPath,
        traces_dir: resolve(config.traceDir),
        tabs
      });
      return;
    }

    jsonResponse(response, 404, {
      error: "Not found",
      paths: {
        health: "/health",
        events: config.eventsPath,
        rpc: config.rpcPath
      }
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    rpcServer.handleUpgrade(request, socket, head);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(config.port, config.host, () => resolve());
  });
  startupLog(`HTTP server listening on ${config.host}:${config.port}`);
  await writeStartupState("http_listening", `${config.host}:${config.port}`);

  sseHub.publish({
    event: "status",
    data: {
      type: "status",
      ts: new Date().toISOString(),
      payload: {
        server: "started",
        mode: config.cdpWsUrl ? "cdp" : "ping_only",
        default_tab_id: getRuntimeTabState().defaultTabId,
        active_tab_id: getRuntimeTabState().activeTabId,
        browser_policy: config.browserPolicy,
        extension_loaded: config.extensionLoaded
      }
    }
  });

  console.log(`Sidecar server running on http://${config.host}:${config.port}`);
  console.log(`Health: http://${config.host}:${config.port}/health`);
  console.log(`SSE: http://${config.host}:${config.port}${config.eventsPath}`);
  console.log(`WS RPC: ws://${config.host}:${config.port}${config.rpcPath}`);
  console.log(`Agent max steps (default): ${defaultAgentMaxSteps}`);
  if (config.cdpWsUrl) {
    console.log(`Chrome CDP: ${config.cdpWsUrl}`);
    if (defaultTabId) {
      console.log(`Default tab_id: ${defaultTabId}`);
    }
  } else {
    console.log("Chrome CDP not detected. Running in ping-only mode.");
    console.log("Set CHROME_CDP_WS_URL (or CHROME_CDP_HOST/CHROME_CDP_PORT) for full browser actions.");
  }

  const shutdown = async (reason: string): Promise<void> => {
    console.log(`Shutting down (${reason})...`);
    targetRouter?.stop();
    sseHub.close();
    await rpcServer.close();
    await traceLogger.flush();
    if (transport) {
      await transport.close();
    }
    if (launchedBrowser?.process && !launchedBrowser.process.killed) {
      try {
        launchedBrowser.process.kill("SIGTERM");
      } catch {
        // Ignore process shutdown errors.
      }
    }
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await writeStartupState("ready");
}

void start().catch((error) => {
  void writeStartupState("failed", error instanceof Error ? error.message : String(error));
  console.error("Failed to start sidecar server:");
  console.error(error);
  process.exit(1);
});
