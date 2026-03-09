import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import WebSocket from "ws";
import {
  assertSelectedModelConfig,
  normalizeGoogleModelId,
  resolveLiveCdpWsUrl,
  resolveLiveModelSelection
} from "./lib/live-cdp-config.js";
import { buildBenchmarkWorkspace } from "./lib/live-benchmark-tabs.js";

const ROOT = process.cwd();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function loadJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readManifestSignature(extensionPath) {
  const manifestPath = path.join(extensionPath, "manifest.json");
  const manifest = loadJson(manifestPath);
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  return {
    name: typeof manifest.name === "string" ? manifest.name.trim() : "",
    description: typeof manifest.description === "string" ? manifest.description.trim() : "",
    version: typeof manifest.version === "string" ? manifest.version.trim() : ""
  };
}

function manifestSignatureMatches(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.name !== ""
    && left.name === right.name
    && left.description !== ""
    && left.description === right.description;
}

export function resolveConfiguredExtensionId({
  root = ROOT,
  profileRoot = process.env.LIVE_CHROME_PROFILE_DIR?.trim() || path.join(process.env.HOME || "", ".local", "share", "new-browser", "chrome-profile"),
  explicitExtensionId = process.env.LIVE_EXTENSION_ID?.trim() || ""
} = {}) {
  const fromEnv = explicitExtensionId;
  if (fromEnv) {
    return fromEnv;
  }

  const extensionPath = path.resolve(root, "extension");
  const extensionManifest = readManifestSignature(extensionPath);
  const candidates = [
    path.join(profileRoot, "Default", "Secure Preferences"),
    path.join(profileRoot, "Default", "Preferences")
  ];

  for (const filePath of candidates) {
    const payload = loadJson(filePath);
    const settings = payload?.extensions?.settings;
    if (!settings || typeof settings !== "object") {
      continue;
    }

    for (const [extensionId, entry] of Object.entries(settings)) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const installedPath = typeof entry.path === "string" ? path.resolve(entry.path) : "";
      if (installedPath === extensionPath) {
        return extensionId;
      }

      if (installedPath) {
        const installedManifest = readManifestSignature(installedPath);
        if (manifestSignatureMatches(extensionManifest, installedManifest)) {
          return extensionId;
        }
      }
    }
  }

  throw new Error("Unable to resolve extension id from Chromium profile");
}

function resolveOutputDir(requestedOutputDir) {
  if (requestedOutputDir && requestedOutputDir.trim()) {
    return path.isAbsolute(requestedOutputDir)
      ? requestedOutputDir
      : path.join(ROOT, "output", "playwright", requestedOutputDir.trim());
  }

  const envValue = process.env.LIVE_QA_OUTPUT_DIR?.trim() || process.env.LIVE_OUTPUT_DIR?.trim() || "live-cdp-panel-check";
  return path.join(ROOT, "output", "playwright", envValue);
}

export function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 0;

  const openPromise = new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  socket.on("message", (raw) => {
    let payload;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (typeof payload.id === "number") {
      const pendingEntry = pending.get(payload.id);
      if (!pendingEntry) {
        return;
      }

      pending.delete(payload.id);
      if (payload.error) {
        pendingEntry.reject(new Error(`[${pendingEntry.method}] ${payload.error.message || "CDP request failed"}`));
        return;
      }

      pendingEntry.resolve(payload.result);
      return;
    }

    if (typeof payload.method !== "string") {
      return;
    }

    const handlers = listeners.get(payload.method);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler({
        sessionId: payload.sessionId,
        params: payload.params
      });
    }
  });

  socket.on("close", () => {
    for (const entry of pending.values()) {
      entry.reject(new Error("Chrome CDP socket closed"));
    }
    pending.clear();
  });

  return {
    async connect() {
      await withTimeout(openPromise, 10_000, "Chrome CDP websocket connection");
    },
    async send(method, params = {}, sessionId) {
      await this.connect();
      nextId += 1;
      const id = nextId;

      const result = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
      });

      const message = { id, method };
      if (params && Object.keys(params).length > 0) {
        message.params = params;
      }
      if (sessionId) {
        message.sessionId = sessionId;
      }

      socket.send(JSON.stringify(message));
      return result;
    },
    on(method, handler) {
      const handlers = listeners.get(method) || new Set();
      handlers.add(handler);
      listeners.set(method, handlers);
    },
    off(method, handler) {
      const handlers = listeners.get(method);
      if (!handlers) {
        return;
      }
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(method);
      }
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) {
        return;
      }

      await new Promise((resolve) => {
        socket.once("close", resolve);
        socket.close(1000, "done");
        setTimeout(resolve, 250);
      });
    }
  };
}

export async function rpcCall(rpcUrl, action, params, tabId = "__system__") {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(rpcUrl);
    const requestId = `live-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const cleanup = () => {
      socket.removeAllListeners();
      try {
        socket.close();
      } catch {
        // Ignore close failures.
      }
    };

    socket.once("error", (error) => {
      cleanup();
      reject(error);
    });

    socket.once("open", () => {
      socket.send(
        JSON.stringify({
          request_id: requestId,
          action,
          tab_id: tabId,
          params
        })
      );
    });

    socket.on("message", (raw) => {
      const payload = JSON.parse(String(raw));
      if (payload.request_id !== requestId) {
        return;
      }

      cleanup();
      if (payload.ok === false) {
        reject(new Error(payload.error?.message || `RPC ${action} failed`));
        return;
      }

      resolve(payload.result);
    });
  });
}

async function enableSession(cdp, sessionId) {
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("DOM.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId).catch(() => undefined);
}

export function isMissingSessionError(error) {
  return error instanceof Error && /session with given id not found/i.test(error.message);
}

export function isMissingTargetError(error) {
  return error instanceof Error && /no target with given id found/i.test(error.message);
}

function normalizeTargetUrl(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url.trim();
  }
}

function targetUrlsMatch(candidateUrl, expectedUrl) {
  const candidate = normalizeTargetUrl(candidateUrl);
  const expected = normalizeTargetUrl(expectedUrl);
  if (!candidate || !expected) {
    return false;
  }
  return candidate === expected || candidate.startsWith(expected) || expected.startsWith(candidate);
}

async function attachToTargetSession(cdp, targetId) {
  const attached = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const sessionId = attached?.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error(`Target.attachToTarget failed for ${targetId}`);
  }

  await enableSession(cdp, sessionId);
  return sessionId;
}

async function resolveCurrentTargetId(cdp, target) {
  if (typeof target.resolveTargetId === "function") {
    const resolved = await target.resolveTargetId(cdp, target);
    if (typeof resolved === "string" && resolved.length > 0) {
      return resolved;
    }
  }

  const expectedUrl = target.matchUrl || target.url;
  if (typeof expectedUrl !== "string" || expectedUrl.length === 0) {
    return null;
  }

  const response = await cdp.send("Target.getTargets", {});
  const targetInfos = Array.isArray(response?.targetInfos) ? response.targetInfos : [];
  const matches = targetInfos.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    if (typeof target.type === "string" && target.type.length > 0 && entry.type !== target.type) {
      return false;
    }
    return targetUrlsMatch(entry.url, expectedUrl);
  });

  const exact = matches.find((entry) => normalizeTargetUrl(entry.url) === normalizeTargetUrl(expectedUrl));
  return exact?.targetId || matches[0]?.targetId || null;
}

async function recoverTargetSession(cdp, target) {
  const nextTargetId = await resolveCurrentTargetId(cdp, target);
  if (typeof nextTargetId !== "string" || nextTargetId.length === 0) {
    throw new Error(`Unable to recover a live target for ${target.matchUrl || target.url || target.targetId || "unknown target"}`);
  }

  target.targetId = nextTargetId;
  target.sessionId = await attachToTargetSession(cdp, nextTargetId);
  return target.sessionId;
}

export async function withRecoveredSession(cdp, target, operation) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation(target.sessionId);
    } catch (error) {
      lastError = error;

      if (!isMissingSessionError(error) && !isMissingTargetError(error)) {
        throw error;
      }

      try {
        if (isMissingTargetError(error)) {
          await recoverTargetSession(cdp, target);
        } else {
          try {
            target.sessionId = await attachToTargetSession(cdp, target.targetId);
          } catch (attachError) {
            if (!isMissingTargetError(attachError)) {
              throw attachError;
            }
            await recoverTargetSession(cdp, target);
          }
        }
      } catch (recoveryError) {
        throw recoveryError;
      }
    }
  }

  throw lastError;
}

async function createPageSession(cdp) {
  const created = await cdp.send("Target.createTarget", { url: "about:blank" });
  const targetId = created?.targetId;
  if (typeof targetId !== "string" || targetId.length === 0) {
    throw new Error("Target.createTarget did not return a target id");
  }

  const sessionId = await attachToTargetSession(cdp, targetId);
  return { targetId, sessionId };
}

async function closeTarget(cdp, targetId) {
  if (typeof targetId !== "string" || targetId.length === 0) {
    return;
  }

  try {
    await cdp.send("Target.closeTarget", { targetId });
  } catch {
    // Best-effort cleanup.
  }
}

async function waitForLoad(cdp, sessionId, timeoutMs) {
  return withTimeout(
    new Promise((resolve) => {
      const onLoad = (payload) => {
        if (payload?.sessionId && payload.sessionId !== sessionId) {
          return;
        }
        cleanup();
        resolve();
      };

      const onLifecycle = (payload) => {
        if (payload?.sessionId && payload.sessionId !== sessionId) {
          return;
        }
        if (payload?.params?.name !== "firstContentfulPaint") {
          return;
        }
        cleanup();
        resolve();
      };

      const cleanup = () => {
        cdp.off("Page.loadEventFired", onLoad);
        cdp.off("Page.lifecycleEvent", onLifecycle);
      };

      cdp.on("Page.loadEventFired", onLoad);
      cdp.on("Page.lifecycleEvent", onLifecycle);
    }),
    timeoutMs,
    "Page load"
  );
}

async function navigateSession(cdp, sessionId, url, timeoutMs = 15_000) {
  const loadPromise = waitForLoad(cdp, sessionId, timeoutMs);

  try {
    await cdp.send("Page.navigate", { url }, sessionId);
  } catch (error) {
    await loadPromise.catch(() => undefined);
    throw error;
  }

  try {
    await loadPromise;
  } catch {
    await sleep(750);
  }
}

async function evaluate(cdp, sessionId, expression, returnByValue = true) {
  const response = await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      returnByValue,
      awaitPromise: true
    },
    sessionId
  );

  if (response?.exceptionDetails) {
    const description = response.exceptionDetails?.exception?.description || response.exceptionDetails?.text || "Runtime.evaluate failed";
    throw new Error(description);
  }

  return returnByValue ? response?.result?.value : response?.result;
}

async function waitForFunction(cdp, sessionId, expression, timeoutMs, pollMs = 250) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await evaluate(cdp, sessionId, expression);
    if (value) {
      return value;
    }
    await sleep(pollMs);
  }

  throw new Error(`Condition timed out after ${timeoutMs}ms`);
}

async function captureScreenshot(cdp, sessionId, filePath) {
  const capture = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  if (typeof capture?.data !== "string" || capture.data.length === 0) {
    throw new Error("Page.captureScreenshot returned an empty payload");
  }

  writeFileSync(filePath, Buffer.from(capture.data, "base64"));
}

async function getPanelSnapshot(cdp, sessionId) {
  return evaluate(
    cdp,
    sessionId,
    `(() => {
      const assistantNodes = Array.from(document.querySelectorAll(".thread-msg.assistant .msg-content"));
      const latestAssistant = assistantNodes.at(-1);
      const assistantText = latestAssistant?.textContent?.trim() ?? "";
      const stopMode = document.querySelector("#btn-send")?.classList.contains("stop-mode") ?? false;
      const toasts = Array.from(document.querySelectorAll(".toast")).map((node) => node.textContent?.trim() ?? "");
      const actionItems = Array.from(document.querySelectorAll(".action-item")).map((node) => node.textContent?.trim() ?? "");
      const sources = Array.from(document.querySelectorAll(".source-chip")).map((node) => node.textContent?.trim() ?? "");
      return { assistantText, stopMode, toasts, actionItems, sources };
    })()`
  );
}

async function waitForAssistantResult(cdp, sessionId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = null;
  let lastLogged = "";

  while (Date.now() < deadline) {
    lastSnapshot = await getPanelSnapshot(cdp, sessionId);

    const logKey = JSON.stringify({
      assistantText: lastSnapshot?.assistantText,
      stopMode: lastSnapshot?.stopMode,
      toasts: lastSnapshot?.toasts
    });
    if (logKey !== lastLogged) {
      console.log(`Panel snapshot: ${logKey}`);
      lastLogged = logKey;
    }

    if (!lastSnapshot?.stopMode && lastSnapshot?.assistantText) {
      return lastSnapshot;
    }

    await sleep(1_000);
  }

  const timeoutError = new Error(`Timed out waiting for assistant result. Last snapshot: ${JSON.stringify(lastSnapshot)}`);
  timeoutError.lastSnapshot = lastSnapshot;
  throw timeoutError;
}

async function stopActiveRun(cdp, sessionId) {
  const stopped = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const button = document.getElementById("btn-send");
      if (!(button instanceof HTMLButtonElement)) {
        return false;
      }
      const stopMode = button.classList.contains("stop-mode");
      if (!stopMode) {
        return false;
      }
      button.click();
      return true;
    })()`
  );

  if (!stopped) {
    return false;
  }

  await waitForFunction(
    cdp,
    sessionId,
    `(() => !(document.getElementById("btn-send")?.classList.contains("stop-mode") ?? false))()`,
    15_000
  ).catch(() => undefined);
  return true;
}

async function clearPanelThread(cdp, sessionId) {
  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const CHAT_SESSIONS_STORAGE_KEY = "ui.chatSessions";
      chrome.storage?.local?.remove?.([CHAT_SESSIONS_STORAGE_KEY], () => void chrome.runtime?.lastError);
      const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.trim() === "New chat");
      if (button) {
        button.click();
      }
      return true;
    })()`
  );

  await waitForFunction(
    cdp,
    sessionId,
    `(() => {
      const thread = document.getElementById("thread");
      const empty = document.getElementById("empty-state");
      const input = document.getElementById("prompt-input");
      return (
        (thread?.hidden ?? false) &&
        !(empty?.hidden ?? true) &&
        (input instanceof HTMLTextAreaElement ? input.value === "" : true)
      );
    })()`,
    5_000
  ).catch(() => undefined);
}

async function sendPrompt(cdp, sessionId, prompt) {
  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const input = document.getElementById("prompt-input");
      if (!(input instanceof HTMLTextAreaElement)) {
        throw new Error("Prompt input not found");
      }
      input.value = ${JSON.stringify(prompt)};
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return input.value;
    })()`
  );

  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const button = document.getElementById("btn-send");
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Send button not found");
      }
      button.click();
      return true;
    })()`
  );
}

async function setSelectedModel(cdp, sessionId, { provider = "google", modelId, mode = "manual" } = {}) {
  const canonicalModelId = provider === "google" ? normalizeGoogleModelId(modelId) : (typeof modelId === "string" ? modelId.trim() : "");

  return evaluate(
    cdp,
    sessionId,
    `(() => new Promise((resolve) => {
      const MODEL_CONFIG_STORAGE_KEY = "ui.modelConfig";
      const MODEL_CATALOG_STORAGE_KEY = "ui.modelCatalog";
      const nextProvider = ${JSON.stringify(provider)};
      const nextModelId = ${JSON.stringify(canonicalModelId)};
      const nextMode = ${JSON.stringify(mode)};
      chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY], (stored) => {
        const config = stored[MODEL_CONFIG_STORAGE_KEY] && typeof stored[MODEL_CONFIG_STORAGE_KEY] === "object"
          ? { ...stored[MODEL_CONFIG_STORAGE_KEY] }
          : {};
        const catalog = Array.isArray(stored[MODEL_CATALOG_STORAGE_KEY]) ? [...stored[MODEL_CATALOG_STORAGE_KEY]] : [];
        const nextConfig = {
          ...config,
          defaultModelMode: nextMode,
          selectedProvider: nextProvider,
          selectedModelId: nextModelId || "auto"
        };
        const shouldAddModel = nextMode === "manual" && nextProvider && nextModelId && !catalog.some((entry) => (
          entry && typeof entry === "object" && entry.provider === nextProvider && entry.id === nextModelId
        ));
        if (shouldAddModel) {
          catalog.push({ provider: nextProvider, id: nextModelId, source: "manual", enabled: true });
        }
        chrome.storage.local.set({
          [MODEL_CONFIG_STORAGE_KEY]: nextConfig,
          [MODEL_CATALOG_STORAGE_KEY]: catalog
        }, () => resolve({ config: nextConfig, catalogSize: catalog.length }));
      });
    }))()`
  );
}

async function sendRuntimeMessage(cdp, sessionId, message) {
  return evaluate(
    cdp,
    sessionId,
    `(() => new Promise((resolve) => {
      chrome.runtime.sendMessage(${JSON.stringify(message)}, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, error: error.message });
          return;
        }
        resolve(response ?? null);
      });
    }))()`
  );
}

async function callExtensionBenchmarkApi(cdp, sessionId, method, payload) {
  return evaluate(
    cdp,
    sessionId,
    `(() => {
      const BENCHMARK_URL_MARKER = "atlas-benchmark=";
      const state = globalThis.__atlasBenchmarkWorkspaces ?? (globalThis.__atlasBenchmarkWorkspaces = new Map());
      const resolveTabUrl = (tab) => tab?.pendingUrl || tab?.url || "";
      const closeTabsByIds = async (tabIds) => {
        const uniqueTabIds = [...new Set((Array.isArray(tabIds) ? tabIds : []).filter((tabId) => typeof tabId === "number"))];
        if (uniqueTabIds.length === 0) {
          return;
        }
        try {
          await chrome.tabs.remove(uniqueTabIds);
        } catch {
          // Best-effort cleanup.
        }
      };
      const sweepStaleBenchmarkTabs = async (allowedUrls) => {
        const allowed = new Set((Array.isArray(allowedUrls) ? allowedUrls : []).filter((value) => typeof value === "string" && value.length > 0));
        const tabs = await chrome.tabs.query({});
        const staleTabIds = tabs
          .filter((tab) => resolveTabUrl(tab).includes(BENCHMARK_URL_MARKER) && !allowed.has(resolveTabUrl(tab)))
          .map((tab) => tab.id);
        await closeTabsByIds(staleTabIds);
      };
      const register = async (benchmarkId, title, tabUrls) => {
        await sweepStaleBenchmarkTabs(tabUrls);
        const allowed = new Set((Array.isArray(tabUrls) ? tabUrls : []).filter((value) => typeof value === "string" && value.length > 0));
        const tabs = await chrome.tabs.query({});
        const matchedTabIds = tabs
          .filter((tab) => allowed.has(resolveTabUrl(tab)) && typeof tab.id === "number")
          .map((tab) => tab.id);
        const previous = state.get(benchmarkId) ?? {
          benchmarkId,
          title,
          tabIds: [],
          groupId: null,
          updatedAt: 0
        };
        const nextTabIds = [...new Set([...(Array.isArray(previous.tabIds) ? previous.tabIds : []), ...matchedTabIds])];
        previous.title = title;
        previous.tabIds = nextTabIds;
        previous.updatedAt = Date.now();
        if (nextTabIds.length > 0) {
          try {
            const groupId = typeof previous.groupId === "number"
              ? await chrome.tabs.group({ groupId: previous.groupId, tabIds: nextTabIds })
              : await chrome.tabs.group({ tabIds: nextTabIds });
            previous.groupId = groupId;
            await chrome.tabGroups.update(groupId, {
              title,
              color: "blue",
              collapsed: false
            });
          } catch {
            previous.groupId = null;
          }
        }
        state.set(benchmarkId, previous);
        return {
          ok: true,
          workspace: {
            benchmarkId: previous.benchmarkId,
            title: previous.title,
            tabIds: [...previous.tabIds],
            groupId: previous.groupId,
            updatedAt: previous.updatedAt
          },
          matched_count: matchedTabIds.length
        };
      };
      const finalize = async (benchmarkId, closeTabs) => {
        const previous = state.get(benchmarkId) ?? null;
        state.delete(benchmarkId);
        if (closeTabs === true) {
          const tabs = await chrome.tabs.query({});
          const matchingTabIds = tabs
            .filter((tab) => resolveTabUrl(tab).includes(\`atlas-benchmark=\${benchmarkId}\`))
            .map((tab) => tab.id);
          const tabIdsToClose = [...(previous?.tabIds ?? []), ...matchingTabIds];
          setTimeout(() => {
            void closeTabsByIds(tabIdsToClose);
          }, 0);
        }
        return {
          ok: true,
          workspace: previous
            ? {
                benchmarkId: previous.benchmarkId,
                title: previous.title,
                tabIds: [...previous.tabIds],
                groupId: previous.groupId,
                updatedAt: previous.updatedAt
              }
            : null
        };
      };
      if (${JSON.stringify(method)} === "register") {
        return register(...${JSON.stringify(payload)});
      }
      if (${JSON.stringify(method)} === "finalize") {
        return finalize(...${JSON.stringify(payload)});
      }
      throw new Error("Unsupported benchmark worker method");
    })()`
  );
}

async function resolveChromeTabIdByUrl(cdp, sessionId, tabUrl) {
  return evaluate(
    cdp,
    sessionId,
    `(() => new Promise((resolve) => {
      const targetUrl = ${JSON.stringify(tabUrl)};
      const normalize = (value) => typeof value === "string" ? value.trim() : "";
      chrome.tabs.query({}, (tabs) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve(null);
          return;
        }
        const match = (Array.isArray(tabs) ? tabs : []).find((tab) => {
          const currentUrl = normalize(tab?.pendingUrl) || normalize(tab?.url);
          return currentUrl === targetUrl;
        });
        resolve(typeof match?.id === "number" ? match.id : null);
      });
    }))()`
  );
}

export async function runLivePanelCheck({
  cdpWsUrl,
  rpcUrl = process.env.LIVE_RPC_URL?.trim() || "ws://127.0.0.1:3210/rpc",
  targetUrl = process.env.LIVE_TARGET_URL?.trim() || process.env.LIVE_SITE_URL?.trim() || "https://the-internet.herokuapp.com/",
  prompt = process.env.LIVE_PROMPT?.trim() || "",
  steerPrompt = process.env.LIVE_STEER_PROMPT?.trim() || "",
  siteEvalSource = process.env.LIVE_SITE_EVAL?.trim() || "",
  timeoutMs = Number.parseInt(process.env.LIVE_RESULT_TIMEOUT_MS ?? process.env.LIVE_TIMEOUT_MS ?? "180000", 10),
  steerDelayMs = Number.parseInt(process.env.LIVE_STEER_DELAY_MS ?? "2500", 10),
  outputDir = resolveOutputDir(),
  provider = process.env.LIVE_PROVIDER?.trim() || "google",
  modelId = process.env.LIVE_MODEL?.trim() || "",
  modelMode = process.env.LIVE_MODEL_MODE?.trim() || ""
} = {}) {
  mkdirSync(outputDir, { recursive: true });
  const selection = resolveLiveModelSelection({
    requestedModelId: modelId,
    provider,
    requestedMode: modelMode,
    benchmarkMode: process.env.LIVE_BENCHMARK_MODE === "1"
  });

  const resolvedCdpWsUrl = cdpWsUrl || await resolveLiveCdpWsUrl();
  const extensionId = resolveConfiguredExtensionId();
  console.log(`Connecting to ${resolvedCdpWsUrl}`);
  console.log(`Resolved extension id: ${extensionId}`);

  const cdp = createCdpClient(resolvedCdpWsUrl);
  await cdp.connect();
  const createdTargets = [];
  let benchmarkWorkspace = null;
  let panel = null;
  let site = null;

  try {
    const scenarioName = (() => {
      try {
        const url = new URL(targetUrl);
        return url.pathname.split("/").filter(Boolean).at(-1) || "scenario";
      } catch {
        return "scenario";
      }
    })();

    benchmarkWorkspace = buildBenchmarkWorkspace({
      targetUrl,
      panelUrl: `chrome-extension://${extensionId}/panel.html`,
      modelId: selection.mode === "manual" ? selection.modelId : "auto",
      scenarioName
    });
    site = await createPageSession(cdp);
    site.type = "page";
    createdTargets.push(site.targetId);
    await navigateSession(cdp, site.sessionId, benchmarkWorkspace.siteUrl);
    site.matchUrl = benchmarkWorkspace.siteUrl;
    console.log(`Loaded target page: ${benchmarkWorkspace.siteUrl}`);

    panel = await createPageSession(cdp);
    panel.type = "page";
    createdTargets.push(panel.targetId);
    await navigateSession(cdp, panel.sessionId, benchmarkWorkspace.panelUrl);
    panel.matchUrl = benchmarkWorkspace.panelUrl;
    await waitForFunction(
      cdp,
      panel.sessionId,
      `(() => {
        const input = document.getElementById("prompt-input");
        return input instanceof HTMLTextAreaElement && input.getAttribute("aria-label") === "Ask anything";
      })()`,
      15_000
    );
    console.log("Panel composer is visible");

    const chromeTabId = await resolveChromeTabIdByUrl(cdp, panel.sessionId, benchmarkWorkspace.siteUrl);
    await rpcCall(rpcUrl, "SetActiveTab", {
      chrome_tab_id: typeof chromeTabId === "number" ? chromeTabId : 0,
      target_id: site.targetId,
      url: benchmarkWorkspace.siteUrl,
      title: await evaluate(cdp, site.sessionId, "document.title")
    });
    console.log(`Synced active tab to target ${site.targetId}${typeof chromeTabId === "number" ? ` (chrome tab ${chromeTabId})` : ""}`);

    const registerResult = await withRecoveredSession(
      cdp,
      panel,
      (sessionId) => callExtensionBenchmarkApi(cdp, sessionId, "register", [
        benchmarkWorkspace.benchmarkMarker,
        benchmarkWorkspace.title,
        [benchmarkWorkspace.siteUrl, benchmarkWorkspace.panelUrl]
      ])
    ).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    if (registerResult?.ok === true) {
      console.log(`Registered benchmark tabs for ${benchmarkWorkspace.benchmarkMarker}`);
    } else if (registerResult?.error) {
      console.warn(`Benchmark tab registration failed: ${registerResult.error}`);
    }

    if (selection.mode === "manual") {
      const configured = await withRecoveredSession(
        cdp,
        panel,
        (sessionId) => setSelectedModel(cdp, sessionId, {
          provider,
          modelId: selection.modelId,
          mode: "manual"
        })
      );
      assertSelectedModelConfig(configured?.config, {
        provider,
        mode: "manual",
        modelId: selection.modelId
      });
      console.log(`Selected model ${configured?.config?.selectedModelId ?? selection.modelId}`);
    } else if (selection.mode === "auto") {
      const configured = await withRecoveredSession(
        cdp,
        panel,
        (sessionId) => setSelectedModel(cdp, sessionId, { provider, modelId: "auto", mode: "auto" })
      );
      assertSelectedModelConfig(configured?.config, {
        provider,
        mode: "auto"
      });
      console.log("Selected auto model mode");
    }

    let panelState = null;
    let elapsedMs = 0;
    if (prompt) {
      await stopActiveRun(cdp, panel.sessionId).catch(() => false);
      await withRecoveredSession(cdp, panel, (sessionId) => clearPanelThread(cdp, sessionId));
      console.log(`Sending prompt: ${prompt}`);
      const startedAt = Date.now();
      await withRecoveredSession(cdp, panel, (sessionId) => sendPrompt(cdp, sessionId, prompt));
      const steerPromise = steerPrompt
        ? (async () => {
            await sleep(Number.isFinite(steerDelayMs) && steerDelayMs >= 0 ? steerDelayMs : 2_500);
            await waitForFunction(
              cdp,
              panel.sessionId,
              `(() => document.getElementById("btn-send")?.classList.contains("stop-mode") ?? false)()`,
              10_000
            ).catch(() => undefined);
            console.log(`Queueing steer prompt: ${steerPrompt}`);
            await withRecoveredSession(cdp, panel, (sessionId) => sendPrompt(cdp, sessionId, steerPrompt));
            return true;
          })().catch((error) => {
            console.warn(`Failed to queue steer prompt: ${error instanceof Error ? error.message : String(error)}`);
            return false;
          })
        : null;
      try {
        panelState = await withRecoveredSession(cdp, panel, (sessionId) => waitForAssistantResult(cdp, sessionId, timeoutMs));
        if (steerPromise) {
          await steerPromise;
        }
        elapsedMs = Date.now() - startedAt;
        console.log(`Assistant result: ${panelState.assistantText}`);
      } catch (error) {
        panelState = error?.lastSnapshot ?? (await withRecoveredSession(cdp, panel, (sessionId) => getPanelSnapshot(cdp, sessionId)).catch(() => null));
        await stopActiveRun(cdp, panel.sessionId).catch(() => false);
        await withRecoveredSession(cdp, panel, (sessionId) => clearPanelThread(cdp, sessionId)).catch(() => undefined);
        throw error;
      }
    }

    const siteState = await withRecoveredSession(
      cdp,
      site,
      (sessionId) => evaluate(
        cdp,
        sessionId,
        `(() => ({
          url: window.location.href,
          title: document.title,
          heading: document.querySelector("h1,h2,h3")?.textContent?.trim() ?? "",
          uploaded: document.getElementById("uploaded-files")?.textContent?.trim() ?? ""
        }))()`
      )
    );

    const siteEval = siteEvalSource
      ? await withRecoveredSession(cdp, site, (sessionId) => evaluate(cdp, sessionId, `(${siteEvalSource})()`))
      : null;

    await withRecoveredSession(cdp, panel, (sessionId) => captureScreenshot(cdp, sessionId, path.join(outputDir, "panel-final.png")));
    await withRecoveredSession(cdp, site, (sessionId) => captureScreenshot(cdp, sessionId, path.join(outputDir, "site-final.png")));

    const report = {
      cdpWsUrl: resolvedCdpWsUrl,
      extensionId,
      targetUrl,
      prompt,
      provider,
      modelId: selection.mode === "manual"
        ? (provider === "google" ? normalizeGoogleModelId(selection.modelId) || selection.modelId : selection.modelId)
        : "auto",
      elapsedMs,
      panel: panelState,
      site: siteState,
      siteEval
    };

    writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    if (panel && benchmarkWorkspace) {
      await withRecoveredSession(
        cdp,
        panel,
        (sessionId) => callExtensionBenchmarkApi(cdp, sessionId, "finalize", [
          benchmarkWorkspace.benchmarkMarker,
          true
        ])
      ).catch(() => undefined);
    }
    for (const targetId of createdTargets.reverse()) {
      await closeTarget(cdp, targetId);
    }
    await cdp.close();
  }
}

async function main() {
  await runLivePanelCheck({
    outputDir: resolveOutputDir(process.env.LIVE_OUTPUT_DIR?.trim() || process.env.LIVE_QA_OUTPUT_DIR?.trim() || "")
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
