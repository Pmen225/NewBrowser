import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import WebSocket from "ws";
import {
  assertSelectedModelConfig,
  normalizeGoogleModelId,
  resolveLiveCdpWsUrl,
  resolveLiveModelSelection
} from "./lib/live-cdp-config.js";
import { buildBenchmarkWorkspace } from "./lib/live-benchmark-tabs.js";
import { assertLoopbackBindReady } from "./lib/loopback-bind.js";
import {
  cleanupPreparedSidecarLaunchCommand,
  prepareSidecarLaunchCommand
} from "./lib/sidecar-launch.js";
import sidecarRuntime from "./lib/sidecar-runtime.cjs";

const ROOT = process.cwd();
const {
  deriveSidecarHealthUrl,
  waitForManagedSidecarRuntimeReadiness,
  waitForSidecarRuntimeReadiness
} = sidecarRuntime;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveManagedSidecarLaunchCommand({ root = ROOT, buildImpl } = {}) {
  return prepareSidecarLaunchCommand({ root, buildImpl });
}

export async function startManagedSidecarProcess({
  cdpWsUrl,
  root = ROOT,
  baseEnv = process.env,
  spawnImpl = spawn,
  buildImpl
}) {
  const launch = await resolveManagedSidecarLaunchCommand({ root, buildImpl });
  const childEnv = { ...baseEnv };

  for (const key of Object.keys(childEnv)) {
    if (key.startsWith("npm_") || key.startsWith("npx_")) {
      delete childEnv[key];
    }
  }
  delete childEnv._;
  const startupStateDir = mkdtempSync(path.join(tmpdir(), "newbrowser-sidecar-startup-"));
  const startupStatePath = path.join(startupStateDir, "startup-state.json");
  const managedStdoutPath = path.join(startupStateDir, "managed-sidecar.stdout.log");
  const managedStderrPath = path.join(startupStateDir, "managed-sidecar.stderr.log");

  const processHandle = spawnImpl(launch.command, launch.args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...childEnv,
      CHROME_CDP_WS_URL: cdpWsUrl,
      SIDECAR_STARTUP_STATE_PATH: startupStatePath
    }
  });

  const stdoutStream = createWriteStream(managedStdoutPath, { flags: "a" });
  const stderrStream = createWriteStream(managedStderrPath, { flags: "a" });
  processHandle.stdout?.on("data", (chunk) => {
    stdoutStream.write(chunk);
    process.stdout.write(chunk);
  });
  processHandle.stderr?.on("data", (chunk) => {
    stderrStream.write(chunk);
    process.stderr.write(chunk);
  });
  processHandle.once?.("close", () => {
    stdoutStream.end();
    stderrStream.end();
    cleanupPreparedSidecarLaunchCommand(launch);
  });

  processHandle.startupStatePath = startupStatePath;
  processHandle.startupStateDir = startupStateDir;
  processHandle.managedStdoutPath = managedStdoutPath;
  processHandle.managedStderrPath = managedStderrPath;
  return processHandle;
}

function readManagedStartupState(processHandle) {
  const startupStatePath = processHandle?.startupStatePath;
  if (typeof startupStatePath !== "string" || startupStatePath.trim().length === 0 || !existsSync(startupStatePath)) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(startupStatePath, "utf8"));
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function managedLogHasContent(filePath) {
  if (typeof filePath !== "string" || filePath.trim().length === 0 || !existsSync(filePath)) {
    return false;
  }

  try {
    return readFileSync(filePath).length > 0;
  } catch {
    return false;
  }
}

function readManagedLog(filePath) {
  if (typeof filePath !== "string" || filePath.trim().length === 0 || !existsSync(filePath)) {
    return "";
  }

  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function isSilentManagedStartupFailure(processHandle) {
  return !readManagedStartupState(processHandle)
    && !managedLogHasContent(processHandle?.managedStdoutPath)
    && !managedLogHasContent(processHandle?.managedStderrPath);
}

function isRetriableManagedStartupFailure(processHandle) {
  if (isSilentManagedStartupFailure(processHandle)) {
    return true;
  }

  const stderr = readManagedLog(processHandle?.managedStderrPath);
  return /ECANCELED:\s*operation canceled,\s*read/i.test(stderr)
    && /tsx\/dist\/esm\/index\.mjs/i.test(stderr);
}

function createManagedSidecarRecoveryError({ healthUrl, cdpWsUrl, cause, processHandle }) {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const startupState = readManagedStartupState(processHandle);
  const phaseDetail =
    typeof startupState?.phase === "string" && startupState.phase.trim().length > 0
      ? ` Last startup phase: ${startupState.phase}${typeof startupState?.detail === "string" && startupState.detail.trim().length > 0 ? ` (${startupState.detail})` : ""}.`
      : "";
  const error = new Error(
    `Assistant sidecar managed recovery failed at ${healthUrl} after starting a local sidecar process (${reason}).${phaseDetail}`
  );
  error.code = "SIDECAR_RUNTIME_MANAGED_START_FAILED";
  error.healthUrl = healthUrl;
  error.cdpWsUrl = cdpWsUrl;
  error.reachable = false;
  error.cause = cause;
  if (startupState) {
    error.startupPhase = startupState.phase;
    error.startupPhaseDetail = startupState.detail;
    error.startupStatePath = processHandle?.startupStatePath;
  } else if (typeof processHandle?.startupStatePath === "string") {
    error.startupPhase = "not_emitted";
    error.startupStatePath = processHandle.startupStatePath;
  }
  if (typeof processHandle?.managedStdoutPath === "string") {
    error.managedStdoutPath = processHandle.managedStdoutPath;
  }
  if (typeof processHandle?.managedStderrPath === "string") {
    error.managedStderrPath = processHandle.managedStderrPath;
  }
  return error;
}

function isLoopbackHost(hostname) {
  const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  if (!host) {
    return false;
  }
  return host === "localhost" || host === "::1" || host.startsWith("127.");
}

function resolveHealthHostname(healthUrl) {
  try {
    return new URL(healthUrl).hostname || "";
  } catch {
    return "";
  }
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

export function validateLiveRunPrompt(prompt, { envVarName = "LIVE_PROMPT" } = {}) {
  const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  if (normalizedPrompt.length === 0) {
    throw new Error(`${envVarName} is required; qa:trace must execute a real task prompt.`);
  }
  return normalizedPrompt;
}

export function prepareLiveRunOutputDir(outputDir) {
  const resolvedOutputDir = typeof outputDir === "string" ? outputDir.trim() : "";
  if (!resolvedOutputDir) {
    throw new Error("A live-run output directory is required.");
  }

  rmSync(resolvedOutputDir, { recursive: true, force: true });
  mkdirSync(resolvedOutputDir, { recursive: true });
  return resolvedOutputDir;
}

function normalizeLiveRunError(error) {
  if (!error) {
    return null;
  }

  const explicitMessage = typeof error?.message === "string" && error.message.trim().length > 0
    ? error.message
    : null;
  const explicitName = typeof error?.name === "string" && error.name.trim().length > 0
    ? error.name
    : null;
  const normalized = {
    name: explicitName || "Error",
    message: explicitMessage || (error instanceof Error ? error.message : String(error))
  };

  if (typeof error?.classification === "string" && error.classification.trim().length > 0) {
    normalized.classification = error.classification;
  }
  if (typeof error?.code === "string" && error.code.trim().length > 0) {
    normalized.code = error.code;
  }

  return normalized;
}

export function buildLiveRunReport({
  cdpWsUrl = "",
  extensionId = "",
  targetUrl = "",
  prompt = "",
  provider = "",
  modelId = "",
  elapsedMs = 0,
  runId = null,
  status = "passed",
  panel = null,
  site = null,
  siteEval = null,
  error = null
} = {}) {
  const report = {
    cdpWsUrl,
    extensionId,
    targetUrl,
    prompt,
    provider,
    modelId,
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0,
    runId: typeof runId === "string" && runId.trim().length > 0 ? runId.trim() : null,
    status: status === "failed" ? "failed" : "passed",
    panel: panel ?? null,
    site: site ?? null,
    siteEval: siteEval ?? null
  };

  const normalizedError = normalizeLiveRunError(error);
  if (normalizedError) {
    report.error = normalizedError;
  }

  return report;
}

function writeLiveRunReport(outputDir, report) {
  writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
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

export async function ensureSidecarRuntimeReady({
  rpcUrl = process.env.LIVE_RPC_URL?.trim() || "ws://127.0.0.1:3210/rpc",
  healthUrl,
  timeoutMs = 15_000,
  pollMs = 250,
  fetchImpl = globalThis.fetch,
  cdpWsUrl = process.env.CHROME_CDP_WS_URL?.trim() || "",
  assertLoopbackReady = assertLoopbackBindReady,
  waitForRuntimeReadiness = waitForSidecarRuntimeReadiness,
  waitForManagedRuntimeReadiness = waitForManagedSidecarRuntimeReadiness,
  startManagedSidecar = ({ cdpWsUrl: managedCdpWsUrl }) => startManagedSidecarProcess({ cdpWsUrl: managedCdpWsUrl })
} = {}) {
  const resolvedHealthUrl = healthUrl?.trim() || deriveSidecarHealthUrl(rpcUrl);
  const healthHost = resolveHealthHostname(resolvedHealthUrl);
  const shouldCheckLoopbackPreflight = isLoopbackHost(healthHost);
  const existingRuntimeRecoveryTimeoutMs = Math.min(Math.max(pollMs * 4, 1_000), Math.max(timeoutMs, 1_000));
  try {
    const payload = await waitForRuntimeReadiness({
      healthUrl: resolvedHealthUrl,
      timeoutMs,
      pollMs,
      fetchImpl
    });
    return {
      healthUrl: resolvedHealthUrl,
      payload,
      recoveredByManagedStart: false,
      recoveredByExistingRuntime: false
    };
  } catch (error) {
    const runtimeUnreachable = Boolean(error && typeof error === "object" && error.reachable === false);
    if (runtimeUnreachable && shouldCheckLoopbackPreflight) {
      try {
        await assertLoopbackReady({ host: healthHost || "127.0.0.1" });
      } catch (loopbackError) {
        const detail = loopbackError instanceof Error ? loopbackError.message : String(loopbackError);
        const wrapped = new Error(
          `Assistant sidecar runtime is unreachable at ${resolvedHealthUrl} and loopback preflight failed. ${detail}`
        );
        wrapped.code = "SIDECAR_RUNTIME_LOOPBACK_BLOCKED";
        wrapped.healthUrl = resolvedHealthUrl;
        wrapped.reachable = false;
        wrapped.cause = error;
        throw wrapped;
      }
    }

    const canAttemptManagedRecovery = Boolean(cdpWsUrl)
      && error
      && typeof error === "object"
      && error.reachable === false;
    if (!canAttemptManagedRecovery) {
      throw error;
    }

    const managedSidecarProcess = await startManagedSidecar({ cdpWsUrl });
    let payload;
    try {
      payload = await waitForManagedRuntimeReadiness({
        serverProcess: managedSidecarProcess,
        healthUrl: resolvedHealthUrl,
        timeoutMs,
        pollMs,
        fetchImpl
      });
    } catch (managedError) {
      try {
        const existingRuntimePayload = await waitForRuntimeReadiness({
          healthUrl: resolvedHealthUrl,
          timeoutMs: existingRuntimeRecoveryTimeoutMs,
          pollMs,
          fetchImpl
        });
        return {
          healthUrl: resolvedHealthUrl,
          payload: existingRuntimePayload,
          recoveredByManagedStart: false,
          recoveredByExistingRuntime: true
        };
      } catch {}

      if (isRetriableManagedStartupFailure(managedSidecarProcess)) {
        await stopManagedSidecarProcess(managedSidecarProcess);
        const retryManagedSidecarProcess = await startManagedSidecar({ cdpWsUrl });
        try {
          payload = await waitForManagedRuntimeReadiness({
            serverProcess: retryManagedSidecarProcess,
            healthUrl: resolvedHealthUrl,
            timeoutMs,
            pollMs,
            fetchImpl
          });
          return {
            healthUrl: resolvedHealthUrl,
            payload,
            recoveredByManagedStart: true,
            recoveredByExistingRuntime: false,
            managedSidecarProcess: retryManagedSidecarProcess,
            managedStartAttemptCount: 2
          };
        } catch (retryManagedError) {
          throw createManagedSidecarRecoveryError({
            healthUrl: resolvedHealthUrl,
            cdpWsUrl,
            cause: retryManagedError,
            processHandle: retryManagedSidecarProcess
          });
        }
      }

      throw createManagedSidecarRecoveryError({
        healthUrl: resolvedHealthUrl,
        cdpWsUrl,
        cause: managedError,
        processHandle: managedSidecarProcess
      });
    }
    return {
      healthUrl: resolvedHealthUrl,
      payload,
      recoveredByManagedStart: true,
      recoveredByExistingRuntime: false,
      managedSidecarProcess,
      managedStartAttemptCount: 1
    };
  }
}

export function buildSetActiveTabPayload({
  chromeTabId,
  targetId,
  url,
  title
}) {
  const payload = {};

  if (typeof chromeTabId === "number") {
    payload.chrome_tab_id = chromeTabId;
  }

  if (typeof targetId === "string" && targetId.trim().length > 0) {
    payload.target_id = targetId;
  }

  if (typeof url === "string" && url.trim().length > 0) {
    payload.url = url;
  }

  if (typeof title === "string" && title.trim().length > 0) {
    payload.title = title;
  }

  return payload;
}

async function stopManagedSidecarProcess(processHandle, signal = "SIGTERM") {
  if (!processHandle || typeof processHandle.kill !== "function" || processHandle.killed) {
    return;
  }
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return;
  }

  try {
    processHandle.kill(signal);
  } catch {
    return;
  }

  if (typeof processHandle.once !== "function") {
    return;
  }

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 1_000);
    processHandle.once("exit", () => {
      clearTimeout(timer);
      resolve(undefined);
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

async function ensureMiniWobTaskStarted(cdp, sessionId) {
  const initialState = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const cover = document.getElementById("sync-task-cover");
      const query = document.querySelector("#query")?.textContent?.trim() ?? "";
      const visible = cover instanceof HTMLElement && getComputedStyle(cover).display !== "none";
      return {
        hasCover: cover instanceof HTMLElement,
        coverVisible: visible,
        query,
        checkboxCount: document.querySelectorAll('input[type="checkbox"]').length
      };
    })()`
  );

  if (!initialState?.hasCover || !initialState?.coverVisible) {
    return {
      started: initialState?.checkboxCount > 0 || Boolean(initialState?.query),
      state: initialState
    };
  }

  await evaluate(
    cdp,
    sessionId,
    `(() => {
      const cover = document.getElementById("sync-task-cover");
      if (!(cover instanceof HTMLElement)) {
        return false;
      }
      cover.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      cover.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
      cover.click();
      return true;
    })()`
  );

  const startedState = await waitForFunction(
    cdp,
    sessionId,
    `(() => {
      const cover = document.getElementById("sync-task-cover");
      const coverVisible = cover instanceof HTMLElement && getComputedStyle(cover).display !== "none";
      const query = document.querySelector("#query")?.textContent?.trim() ?? "";
      const checkboxCount = document.querySelectorAll('input[type="checkbox"]').length;
      if (coverVisible || (!query && checkboxCount === 0)) {
        return null;
      }
      return { coverVisible, query, checkboxCount };
    })()`,
    5_000,
    100
  );

  return {
    started: true,
    state: startedState
  };
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
  await installAgentRunCapture(cdp, sessionId);

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

  const capturedRun = await waitForFunction(
    cdp,
    sessionId,
    `(() => {
      const capture = globalThis.__atlasLiveAgentRunCapture;
      if (!capture || typeof capture !== "object") {
        return null;
      }
      if (capture.lastError) {
        return {
          runId: "",
          requestId: capture.lastRequestId || "",
          lastError: capture.lastError
        };
      }
      if (capture.lastRequestId && capture.responseSeen) {
        return {
          runId: capture.lastRunId || "",
          requestId: capture.lastRequestId || "",
          lastError: ""
        };
      }
      return null;
    })()`,
    10_000,
    100
  );

  if (capturedRun?.lastError) {
    throw new Error(`AgentRun failed before the live run started: ${capturedRun.lastError}`);
  }
  if (!capturedRun?.runId) {
    throw new Error("AgentRun response did not include a run id.");
  }

  return capturedRun;
}

async function installAgentRunCapture(cdp, sessionId) {
  await evaluate(
    cdp,
    sessionId,
    `(() => {
      if (globalThis.__atlasLiveAgentRunCaptureInstalled) {
        return true;
      }

      globalThis.__atlasLiveAgentRunCaptureInstalled = true;
      globalThis.__atlasLiveAgentRunCapture = {
        lastRequestId: "",
        lastRunId: "",
        lastError: "",
        lastPrompt: "",
        responseSeen: false
      };

      const state = globalThis.__atlasLiveAgentRunCapture;
      const originalSend = WebSocket.prototype.send;

      const decodePayload = (value) => {
        if (typeof value === "string") {
          return value;
        }
        if (value instanceof ArrayBuffer) {
          return new TextDecoder().decode(new Uint8Array(value));
        }
        if (ArrayBuffer.isView(value)) {
          return new TextDecoder().decode(value);
        }
        return "";
      };

      const ensureListener = (socket) => {
        if (socket.__atlasLiveAgentRunCaptureListenerInstalled) {
          return;
        }
        socket.__atlasLiveAgentRunCaptureListenerInstalled = true;
        socket.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(typeof event.data === "string" ? event.data : "");
            const requestId = typeof payload?.request_id === "string" ? payload.request_id : "";
            if (!requestId || requestId !== state.lastRequestId) {
              return;
            }
            state.responseSeen = true;
            state.lastError = payload?.ok === false
              ? (payload?.error?.message || "AgentRun failed")
              : "";
            const result = payload?.result;
            state.lastRunId = typeof result?.run_id === "string"
              ? result.run_id
              : (typeof result?.id === "string" ? result.id : "");
          } catch {}
        });
      };

      WebSocket.prototype.send = function patchedSend(data) {
        ensureListener(this);
        try {
          const raw = decodePayload(data);
          if (raw) {
            const payload = JSON.parse(raw);
            if (payload?.action === "AgentRun") {
              state.lastRequestId = typeof payload?.request_id === "string" ? payload.request_id : "";
              state.lastPrompt = typeof payload?.params?.prompt === "string" ? payload.params.prompt : "";
              state.lastRunId = "";
              state.lastError = "";
              state.responseSeen = false;
            }
          }
        } catch {}
        return originalSend.call(this, data);
      };

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
  const resolvedOutputDir = prepareLiveRunOutputDir(outputDir);
  let normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  let selection = null;
  let resolvedCdpWsUrl = typeof cdpWsUrl === "string" ? cdpWsUrl : "";
  let extensionId = "";
  let cdp = null;
  const createdTargets = [];
  let benchmarkWorkspace = null;
  let panel = null;
  let site = null;
  let runId = null;
  let panelState = null;
  let siteState = null;
  let siteEval = null;
  let elapsedMs = 0;
  let managedSidecarProcess = null;

  try {
    normalizedPrompt = validateLiveRunPrompt(prompt);
    selection = resolveLiveModelSelection({
      requestedModelId: modelId,
      provider,
      requestedMode: modelMode,
      benchmarkMode: process.env.LIVE_BENCHMARK_MODE === "1"
    });
    resolvedCdpWsUrl = cdpWsUrl || await resolveLiveCdpWsUrl();
    const sidecarRuntimeState = await ensureSidecarRuntimeReady({
      rpcUrl,
      cdpWsUrl: resolvedCdpWsUrl
    });
    managedSidecarProcess = sidecarRuntimeState.managedSidecarProcess;
    extensionId = resolveConfiguredExtensionId();
    console.log(`Connecting to ${resolvedCdpWsUrl}`);
    console.log(`Resolved extension id: ${extensionId}`);
    console.log(`Sidecar runtime ready via ${sidecarRuntimeState.healthUrl}`);
    if (sidecarRuntimeState.recoveredByManagedStart) {
      if (sidecarRuntimeState.managedStartAttemptCount > 1) {
        console.log("Recovered sidecar runtime by retrying managed sidecar startup after an early launch failure");
      } else {
        console.log("Recovered sidecar runtime by starting a managed sidecar process for this run");
      }
    } else if (sidecarRuntimeState.recoveredByExistingRuntime) {
      console.log("Recovered sidecar runtime by reconnecting to an already-running sidecar after managed startup failed");
    }

    cdp = createCdpClient(resolvedCdpWsUrl);
    await cdp.connect();

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

    if (/\/miniwob\//i.test(targetUrl)) {
      const startState = await ensureMiniWobTaskStarted(cdp, site.sessionId);
      if (startState.started) {
        console.log(`MiniWoB episode started${startState.state?.query ? `: ${startState.state.query}` : ""}`);
      }
    }

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
    await rpcCall(
      rpcUrl,
      "SetActiveTab",
      buildSetActiveTabPayload({
        chromeTabId,
        targetId: site.targetId,
        url: benchmarkWorkspace.siteUrl,
        title: await evaluate(cdp, site.sessionId, "document.title")
      })
    );
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

    await stopActiveRun(cdp, panel.sessionId).catch(() => false);
    await withRecoveredSession(cdp, panel, (sessionId) => clearPanelThread(cdp, sessionId));
    console.log(`Sending prompt: ${normalizedPrompt}`);
    const startedAt = Date.now();
    const sendResult = await withRecoveredSession(cdp, panel, (sessionId) => sendPrompt(cdp, sessionId, normalizedPrompt));
    runId = sendResult.runId;
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
      throw error;
    }

    siteState = await withRecoveredSession(
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

    siteEval = siteEvalSource
      ? await withRecoveredSession(cdp, site, (sessionId) => evaluate(cdp, sessionId, `(${siteEvalSource})()`))
      : null;

    await withRecoveredSession(cdp, panel, (sessionId) => captureScreenshot(cdp, sessionId, path.join(resolvedOutputDir, "panel-final.png")));
    await withRecoveredSession(cdp, site, (sessionId) => captureScreenshot(cdp, sessionId, path.join(resolvedOutputDir, "site-final.png")));

    const report = buildLiveRunReport({
      cdpWsUrl: resolvedCdpWsUrl,
      extensionId,
      targetUrl,
      prompt: normalizedPrompt,
      provider,
      modelId: selection?.mode === "manual"
        ? (provider === "google" ? normalizeGoogleModelId(selection.modelId) || selection.modelId : selection.modelId)
        : (selection?.mode === "auto" ? "auto" : modelId),
      elapsedMs,
      runId,
      status: "passed",
      panel: panelState,
      site: siteState,
      siteEval
    });

    writeLiveRunReport(resolvedOutputDir, report);
    console.log(JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    if (cdp && panel) {
      panelState = panelState ?? (await withRecoveredSession(cdp, panel, (sessionId) => getPanelSnapshot(cdp, sessionId)).catch(() => null));
      await withRecoveredSession(cdp, panel, (sessionId) => captureScreenshot(cdp, sessionId, path.join(resolvedOutputDir, "panel-final.png"))).catch(() => undefined);
    }
    if (cdp && site) {
      siteState = siteState ?? (await withRecoveredSession(
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
      ).catch(() => null));
      await withRecoveredSession(cdp, site, (sessionId) => captureScreenshot(cdp, sessionId, path.join(resolvedOutputDir, "site-final.png"))).catch(() => undefined);
      if (siteEvalSource && siteEval === null) {
        siteEval = await withRecoveredSession(cdp, site, (sessionId) => evaluate(cdp, sessionId, `(${siteEvalSource})()`)).catch(() => null);
      }
    }

    const failureReport = buildLiveRunReport({
      cdpWsUrl: resolvedCdpWsUrl || "",
      extensionId: typeof extensionId === "string" ? extensionId : "",
      targetUrl,
      prompt: typeof normalizedPrompt === "string" ? normalizedPrompt : "",
      provider,
      modelId: selection?.mode === "manual"
        ? (provider === "google" ? normalizeGoogleModelId(selection.modelId) || selection.modelId : selection.modelId)
        : (selection?.mode === "auto" ? "auto" : modelId),
      elapsedMs,
      runId,
      status: "failed",
      panel: panelState,
      site: siteState,
      siteEval,
      error
    });
    writeLiveRunReport(resolvedOutputDir, failureReport);
    throw error;
  } finally {
    await stopManagedSidecarProcess(managedSidecarProcess).catch(() => undefined);
    if (cdp && panel && benchmarkWorkspace) {
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
    if (cdp) {
      await cdp.close().catch(() => undefined);
    }
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
