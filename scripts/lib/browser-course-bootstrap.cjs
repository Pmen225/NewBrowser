const process = require("node:process");

const {
  assertPlaywrightBootstrapReady,
  parseBootstrapFailureDetail
} = require("./playwright-bootstrap-check.cjs");

function detectPlaywrightBootstrapFailure(error) {
  if (error && typeof error === "object") {
    const name = typeof error.name === "string" ? error.name : "";
    const classification = typeof error.classification === "string" ? error.classification : "";
    if (name === "PlaywrightBootstrapError" || classification.startsWith("runtime_bootstrap_")) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  return /playwright bootstrap probe failed/i.test(message) ? message : "";
}

function resolvePlaywrightBootstrapReadiness({
  assertReady = assertPlaywrightBootstrapReady,
  timeoutMs = 15_000,
  skip = process.env.LIVE_SKIP_PLAYWRIGHT_BOOTSTRAP_CHECK === "1"
} = {}) {
  if (skip) {
    return {
      ready: true,
      detail: "",
      failureMode: ""
    };
  }

  try {
    assertReady({ timeoutMs });
    return {
      ready: true,
      detail: "",
      failureMode: ""
    };
  } catch (error) {
    const detail = detectPlaywrightBootstrapFailure(error) || (error instanceof Error ? error.message : String(error));
    const parsed = parseBootstrapFailureDetail(detail);
    return {
      ready: false,
      detail,
      failureMode: parsed.classification || "runtime_bootstrap_failure"
    };
  }
}

function resolveBrowserCourseScenarioPreflight({
  startupFailure = null,
  bootstrapReadiness = { ready: true, detail: "", failureMode: "" }
} = {}) {
  return {
    canRunScenarios: !startupFailure,
    bootstrapReady: bootstrapReadiness?.ready !== false,
    bootstrapFailure: bootstrapReadiness?.ready === false ? (bootstrapReadiness.detail || "") : "",
    bootstrapFailureMode: bootstrapReadiness?.ready === false ? (bootstrapReadiness.failureMode || "") : ""
  };
}

function shouldFailBrowserCourseBenchmarkProcess({ summaries = [] } = {}) {
  return Array.isArray(summaries)
    && summaries.length > 0
    && summaries.every((summary) => {
      const totalCount = Number.isFinite(summary?.totalCount) ? Math.max(0, Math.round(summary.totalCount)) : 0;
      const passCount = Number.isFinite(summary?.passCount) ? Math.max(0, Math.round(summary.passCount)) : 0;
      const hardFailureCount = Number.isFinite(summary?.hardFailureCount)
        ? Math.max(0, Math.round(summary.hardFailureCount))
        : 0;
      return totalCount > 0 && passCount === 0 && hardFailureCount >= totalCount;
    });
}

function messageFromError(error) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function extractFailureModeFromText(text) {
  const value = typeof text === "string" ? text : "";
  if (!value) {
    return "";
  }

  const classificationMatch = value.match(/\bclassification=([a-z0-9_.-]+)/i);
  if (classificationMatch?.[1]) {
    return classificationMatch[1].toLowerCase();
  }

  const failureModeMatch = value.match(/\bfailureMode=([a-z0-9_.-]+)/i);
  if (failureModeMatch?.[1]) {
    return failureModeMatch[1].toLowerCase();
  }

  return "";
}

function classifyBenchmarkRuntimeFailure(error) {
  const bootstrapDetail = detectPlaywrightBootstrapFailure(error);
  if (bootstrapDetail) {
    const parsed = parseBootstrapFailureDetail(bootstrapDetail);
    return {
      failureMode: parsed.classification || "runtime_bootstrap_failure",
      detail: bootstrapDetail
    };
  }

  const explicitFailureMode = typeof error?.failureMode === "string" && error.failureMode.trim()
    ? error.failureMode.trim().toLowerCase()
    : "";
  if (explicitFailureMode) {
    return {
      failureMode: explicitFailureMode,
      detail: messageFromError(error)
    };
  }

  const explicitClassification = typeof error?.classification === "string" && error.classification.trim()
    ? error.classification.trim().toLowerCase()
    : "";
  if (explicitClassification) {
    return {
      failureMode: explicitClassification,
      detail: messageFromError(error)
    };
  }

  const detail = messageFromError(error);
  const extracted = extractFailureModeFromText(detail);
  if (extracted) {
    return {
      failureMode: extracted,
      detail
    };
  }

  return null;
}

module.exports = {
  classifyBenchmarkRuntimeFailure,
  detectPlaywrightBootstrapFailure,
  extractFailureModeFromText,
  resolveBrowserCourseScenarioPreflight,
  resolvePlaywrightBootstrapReadiness,
  shouldFailBrowserCourseBenchmarkProcess
};
