const DEFAULT_SMOKE_HEALTH_URL = "http://127.0.0.1:3210/health";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSidecarTabs(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if (!Array.isArray(payload.tabs)) {
    return [];
  }
  return payload.tabs;
}

function assessSidecarHealthPayload(payload, options = {}) {
  const requireModeCdp = options.requireModeCdp !== false;
  const requireTabs = options.requireTabs !== false;
  const requireExtensionLoaded = options.requireExtensionLoaded !== false;

  if (!payload || typeof payload !== "object") {
    return { ready: false, reason: "payload:invalid" };
  }
  if (payload.ok !== true) {
    return { ready: false, reason: "payload:ok_false" };
  }

  if (requireModeCdp) {
    const mode = typeof payload.mode === "string" ? payload.mode : "unknown";
    if (mode !== "cdp") {
      return { ready: false, reason: `mode:${mode}` };
    }
  }

  if (requireExtensionLoaded && payload.extension_loaded !== true) {
    return { ready: false, reason: "extension:not_loaded" };
  }

  if (requireTabs) {
    const tabs = normalizeSidecarTabs(payload);
    if (tabs.length === 0) {
      return { ready: false, reason: "tabs:empty" };
    }
  }

  return { ready: true, reason: "ready" };
}

function deriveSidecarHealthUrl(rpcUrl = "ws://127.0.0.1:3210/rpc") {
  const parsed = new URL(rpcUrl);
  parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
  parsed.pathname = "/health";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function createRuntimeReadinessError({ healthUrl, timeoutMs, lastReason, reachable }) {
  const error = new Error(
    `Assistant sidecar did not become runtime-ready at ${healthUrl} within ${timeoutMs}ms (${lastReason}).`
  );
  error.code = "SIDECAR_RUNTIME_NOT_READY";
  error.healthUrl = healthUrl;
  error.lastReason = lastReason;
  error.reachable = reachable;
  return error;
}

async function pollSidecarRuntimeReadiness({
  healthUrl,
  timeoutMs,
  pollMs,
  fetchImpl,
  requireModeCdp,
  requireTabs,
  requireExtensionLoaded,
  shouldAbort
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required for sidecar health checks.");
  }

  const deadline = Date.now() + timeoutMs;
  let lastReason = "unreachable";
  let reachable = false;

  while (Date.now() <= deadline) {
    if (shouldAbort?.()) {
      break;
    }

    try {
      const response = await fetchImpl(healthUrl);
      reachable = true;
      if (!response.ok) {
        lastReason = `http:${response.status}`;
      } else {
        const payload = await response.json();
        const verdict = assessSidecarHealthPayload(payload, {
          requireModeCdp,
          requireTabs,
          requireExtensionLoaded
        });
        if (verdict.ready) {
          return payload;
        }
        lastReason = verdict.reason;
      }
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "fetch_failed";
    }

    await sleep(pollMs);
  }

  throw createRuntimeReadinessError({
    healthUrl,
    timeoutMs,
    lastReason,
    reachable
  });
}

async function waitForSidecarRuntimeReadiness({
  healthUrl = DEFAULT_SMOKE_HEALTH_URL,
  timeoutMs = 12_000,
  pollMs = 200,
  fetchImpl = globalThis.fetch,
  requireModeCdp = true,
  requireTabs = true,
  requireExtensionLoaded = true
} = {}) {
  return pollSidecarRuntimeReadiness({
    healthUrl,
    timeoutMs,
    pollMs,
    fetchImpl,
    requireModeCdp,
    requireTabs,
    requireExtensionLoaded
  });
}

async function waitForManagedSidecarRuntimeReadiness({
  serverProcess,
  healthUrl = DEFAULT_SMOKE_HEALTH_URL,
  timeoutMs = 12_000,
  pollMs = 200,
  fetchImpl = globalThis.fetch,
  requireModeCdp = true,
  requireTabs = true,
  requireExtensionLoaded = true
} = {}) {
  if (!serverProcess || typeof serverProcess.once !== "function") {
    return waitForSidecarRuntimeReadiness({
      healthUrl,
      timeoutMs,
      pollMs,
      fetchImpl,
      requireModeCdp,
      requireTabs,
      requireExtensionLoaded
    });
  }

  let settled = false;
  let lastReason = "unreachable";
  let reachable = false;

  const exitPromise = new Promise((_, reject) => {
    const handleExit = (code, signal) => {
      if (settled) {
        return;
      }
      const error = new Error(
        `Assistant sidecar exited before it became runtime-ready at ${healthUrl} (code=${code ?? "null"} signal=${signal ?? "null"}; lastReason=${lastReason}).`
      );
      error.code = "SIDECAR_RUNTIME_EXITED";
      error.healthUrl = healthUrl;
      error.lastReason = lastReason;
      error.reachable = reachable;
      reject(error);
    };

    serverProcess.once("exit", handleExit);
  });

  const readinessPromise = pollSidecarRuntimeReadiness({
    healthUrl,
    timeoutMs,
    pollMs,
    fetchImpl,
    requireModeCdp,
    requireTabs,
    requireExtensionLoaded,
    shouldAbort: () => settled
  }).catch((error) => {
    if (typeof error?.lastReason === "string") {
      lastReason = error.lastReason;
    }
    if (typeof error?.reachable === "boolean") {
      reachable = error.reachable;
    }
    throw error;
  });

  return Promise.race([
    readinessPromise.then((payload) => {
      settled = true;
      return payload;
    }),
    exitPromise
  ]);
}

module.exports = {
  DEFAULT_SMOKE_HEALTH_URL,
  assessSidecarHealthPayload,
  deriveSidecarHealthUrl,
  waitForManagedSidecarRuntimeReadiness,
  waitForSidecarRuntimeReadiness
};
