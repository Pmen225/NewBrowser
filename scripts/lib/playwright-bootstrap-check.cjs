const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 12_000;
const DEFAULT_BOOTSTRAP_PHASE_TIMEOUT_MS = 8_000;
const DEFAULT_BOOTSTRAP_CACHE_TTL_MS = 120_000;
const DEFAULT_BOOTSTRAP_PHASE_RETRY_COUNT = 1;

const BOOTSTRAP_PROBE_PHASES = Object.freeze([
  {
    id: "resolve-playwright",
    script: "process.stdout.write(require.resolve('playwright'));"
  },
  {
    id: "load-playwright-core",
    script: "require('playwright-core'); process.stdout.write('ok');"
  },
  {
    id: "load-playwright",
    script: "const { chromium } = require('playwright'); if (!chromium || typeof chromium.launchPersistentContext !== 'function') { throw new Error('chromium launch API missing'); } process.stdout.write('ok');"
  }
]);

function normalizeChunk(text, maxLines = 3) {
  if (typeof text !== "string" || text.trim().length === 0) {
    return "";
  }

  return text
    .trim()
    .split(/\r?\n/)
    .slice(0, maxLines)
    .join(" | ");
}

function runNodeScriptProbe({
  script,
  timeoutMs,
  cwd = process.cwd(),
  nodePath = process.execPath
} = {}) {
  try {
    const stdout = execFileSync(
      nodePath,
      [
        "-e",
        script
      ],
      {
        cwd,
        timeout: timeoutMs,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    return ({
      ok: true,
      stdout: String(stdout ?? ""),
      stderr: ""
    });
  } catch (error) {
    return ({
      ok: false,
      code: error && typeof error === "object" ? error.code : "UNKNOWN",
      signal: error && typeof error === "object" ? error.signal : undefined,
      message: error instanceof Error ? error.message : String(error),
      stdout: error && typeof error === "object" && typeof error.stdout === "string" ? error.stdout : String(error?.stdout ?? ""),
      stderr: error && typeof error === "object" && typeof error.stderr === "string" ? error.stderr : String(error?.stderr ?? "")
    });
  }
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveBootstrapCachePath(cwd = process.cwd()) {
  const configured = typeof process.env.PLAYWRIGHT_BOOTSTRAP_CACHE_PATH === "string"
    ? process.env.PLAYWRIGHT_BOOTSTRAP_CACHE_PATH.trim()
    : "";
  if (configured) {
    return configured;
  }
  return path.join(cwd, "output", "playwright", ".runtime", "playwright-bootstrap-cache.json");
}

function resolveBootstrapFingerprint({
  cwd = process.cwd(),
  nodePath = process.execPath
} = {}) {
  return {
    cwd,
    nodePath,
    nodeVersion: process.version
  };
}

function readFreshCachedBootstrapFailure({
  cachePath,
  nowMs,
  cacheTtlMs,
  fingerprint = null
} = {}) {
  try {
    const raw = readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const timestamp = typeof parsed.timestamp === "number" ? parsed.timestamp : NaN;
    const result = parsed.result && typeof parsed.result === "object" ? parsed.result : null;
    const cachedFingerprint =
      parsed.fingerprint && typeof parsed.fingerprint === "object" ? parsed.fingerprint : null;
    if (!Number.isFinite(timestamp) || !result || result.ok !== false) {
      return null;
    }

    if (
      fingerprint &&
      cachedFingerprint &&
      (
        cachedFingerprint.cwd !== fingerprint.cwd ||
        cachedFingerprint.nodePath !== fingerprint.nodePath ||
        cachedFingerprint.nodeVersion !== fingerprint.nodeVersion
      )
    ) {
      return null;
    }

    if (nowMs - timestamp > cacheTtlMs) {
      return null;
    }

    return {
      timestamp,
      result
    };
  } catch {
    return null;
  }
}

function persistBootstrapProbeCache({
  cachePath,
  nowMs,
  result,
  classification,
  fingerprint = null
} = {}) {
  try {
    mkdirSync(path.dirname(cachePath), { recursive: true });
    const cacheEntry = {
      timestamp: nowMs,
      fingerprint: fingerprint || undefined,
      result: {
        ...result,
        classification: typeof classification === "string" ? classification : ""
      }
    };
    writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), "utf8");
  } catch {
    // Cache persistence is best-effort only.
  }
}

function isBootstrapTimeoutFailure(result = {}) {
  const code = typeof result.code === "string" ? result.code : "";
  const message = typeof result.message === "string" ? result.message : "";
  return code === "ETIMEDOUT" || /timed out|timeout/i.test(message);
}

function runPlaywrightBootstrapProbe(options = {}) {
  const {
    cacheDisabled: cacheDisabledOption,
    timeoutMs = DEFAULT_BOOTSTRAP_TIMEOUT_MS,
    phaseTimeoutMs = DEFAULT_BOOTSTRAP_PHASE_TIMEOUT_MS,
    phaseRetryCount = parseNonNegativeInteger(
      process.env.PLAYWRIGHT_BOOTSTRAP_PHASE_RETRIES,
      DEFAULT_BOOTSTRAP_PHASE_RETRY_COUNT
    ),
    cwd = process.cwd(),
    nodePath = process.execPath,
    phases = BOOTSTRAP_PROBE_PHASES,
    probeRunner = runNodeScriptProbe,
    cachePath = resolveBootstrapCachePath(cwd),
    cacheTtlMs = parsePositiveInteger(process.env.PLAYWRIGHT_BOOTSTRAP_CACHE_TTL_MS, DEFAULT_BOOTSTRAP_CACHE_TTL_MS),
    cacheDisabled: defaultCacheDisabled = process.env.PLAYWRIGHT_BOOTSTRAP_CACHE_DISABLE === "1",
    nowMs = Date.now()
  } = options;
  const cacheConfiguredExplicitly =
    typeof cacheDisabledOption === "boolean"
    || Object.prototype.hasOwnProperty.call(options, "cachePath")
    || Object.prototype.hasOwnProperty.call(options, "cacheTtlMs")
    || typeof process.env.PLAYWRIGHT_BOOTSTRAP_CACHE_PATH === "string";
  const cacheDisabled = typeof cacheDisabledOption === "boolean"
    ? cacheDisabledOption
    : (defaultCacheDisabled || (probeRunner !== runNodeScriptProbe && !cacheConfiguredExplicitly));
  const perPhaseTimeoutMs = Math.max(500, Math.min(phaseTimeoutMs, timeoutMs));
  const startedAt = Date.now();
  const fingerprint = resolveBootstrapFingerprint({ cwd, nodePath });

  if (!cacheDisabled) {
    const cached = readFreshCachedBootstrapFailure({ cachePath, nowMs, cacheTtlMs, fingerprint });
    if (cached) {
      return {
        ...cached.result,
        message: `cached bootstrap failure from ${new Date(cached.timestamp).toISOString()}; ${cached.result.message || "previous probe failed"}`
      };
    }
  }

  for (const phase of phases) {
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = timeoutMs - elapsedMs;
    if (remainingMs <= 0) {
      const timeoutResult = {
        ok: false,
        phase: phase.id,
        code: "ETIMEDOUT",
        signal: "SIGTERM",
        message: `playwright bootstrap overall timeout exceeded before phase '${phase.id}'`,
        stdout: "",
        stderr: ""
      };
      if (!cacheDisabled) {
        persistBootstrapProbeCache({
          cachePath,
          nowMs,
          result: timeoutResult,
          classification: classifyPlaywrightBootstrapFailure(timeoutResult),
          fingerprint
        });
      }
      return timeoutResult;
    }

    let retryAttempt = 0;
    while (retryAttempt <= phaseRetryCount) {
      const result = probeRunner({
        script: phase.script,
        timeoutMs: Math.min(perPhaseTimeoutMs, remainingMs),
        cwd,
        nodePath
      });
      if (result.ok) {
        break;
      }

      if (isBootstrapTimeoutFailure(result) && retryAttempt < phaseRetryCount) {
        retryAttempt += 1;
        continue;
      }

      const failureResult = {
        ...result,
        phase: phase.id,
        attempts: retryAttempt + 1
      };
      if (!cacheDisabled) {
        persistBootstrapProbeCache({
          cachePath,
          nowMs,
          result: failureResult,
          classification: classifyPlaywrightBootstrapFailure(failureResult),
          fingerprint
        });
      }
      return failureResult;
    }
  }

  const successResult = {
    ok: true,
    phase: "complete",
    stdout: "ok",
    stderr: ""
  };
  if (!cacheDisabled) {
    persistBootstrapProbeCache({
      cachePath,
      nowMs,
      result: successResult,
      classification: "",
      fingerprint
    });
  }
  return successResult;
}

function formatBootstrapFailureDetail(result) {
  const fields = [];
  if (result.phase) {
    fields.push(`phase=${result.phase}`);
  }
  if (result.code) {
    fields.push(`code=${result.code}`);
  }
  if (result.signal) {
    fields.push(`signal=${result.signal}`);
  }
  if (result.message) {
    fields.push(`message=${result.message}`);
  }

  const stdout = normalizeChunk(result.stdout);
  if (stdout) {
    fields.push(`stdout=${stdout}`);
  }

  const stderr = normalizeChunk(result.stderr);
  if (stderr) {
    fields.push(`stderr=${stderr}`);
  }

  return fields.join("; ");
}

function classifyPlaywrightBootstrapFailure(result = {}) {
  const phase = typeof result.phase === "string" ? result.phase : "";
  const code = typeof result.code === "string" ? result.code : "UNKNOWN";
  const message = typeof result.message === "string" ? result.message : "";

  if (code === "ETIMEDOUT" || /timed out|timeout/i.test(message)) {
    return "runtime_bootstrap_timeout";
  }
  if (phase === "resolve-playwright" && (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND")) {
    return "runtime_bootstrap_dependency_missing";
  }
  return "runtime_bootstrap_failure";
}

function parseBootstrapFailureDetail(detail = "") {
  const text = typeof detail === "string" ? detail : "";
  const readField = (name) => {
    const match = text.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1].trim() : "";
  };
  const phase = readField("phase");
  const code = readField("code");
  const signal = readField("signal");
  const classification = classifyPlaywrightBootstrapFailure({ phase, code });
  return {
    classification,
    phase,
    code: code || "UNKNOWN",
    signal
  };
}

function assertPlaywrightBootstrapReady({
  timeoutMs = DEFAULT_BOOTSTRAP_TIMEOUT_MS,
  phaseTimeoutMs = DEFAULT_BOOTSTRAP_PHASE_TIMEOUT_MS,
  runner = runPlaywrightBootstrapProbe
} = {}) {
  const result = runner({ timeoutMs, phaseTimeoutMs });
  if (result.ok) {
    return;
  }

  const detail = formatBootstrapFailureDetail(result);
  const classification = classifyPlaywrightBootstrapFailure(result);
  const error = new Error(
    `Playwright bootstrap probe failed in ${timeoutMs}ms; classification=${classification}; refusing to run headed runtime flow. ${detail}`
  );
  error.name = "PlaywrightBootstrapError";
  error.classification = classification;
  error.phase = typeof result.phase === "string" ? result.phase : "";
  error.code = typeof result.code === "string" ? result.code : "UNKNOWN";
  if (typeof result.signal === "string" && result.signal.length > 0) {
    error.signal = result.signal;
  }
  error.detail = detail;
  throw error;
}

module.exports = {
  DEFAULT_BOOTSTRAP_TIMEOUT_MS,
  DEFAULT_BOOTSTRAP_PHASE_TIMEOUT_MS,
  DEFAULT_BOOTSTRAP_CACHE_TTL_MS,
  DEFAULT_BOOTSTRAP_PHASE_RETRY_COUNT,
  BOOTSTRAP_PROBE_PHASES,
  runNodeScriptProbe,
  runPlaywrightBootstrapProbe,
  formatBootstrapFailureDetail,
  classifyPlaywrightBootstrapFailure,
  parseBootstrapFailureDetail,
  assertPlaywrightBootstrapReady
};
