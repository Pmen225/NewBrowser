import {
  defaultChromeProfileRoot,
  formatCdpDiscoveryFailure,
  resolveRunningChromeCdpWsUrl
} from "./cdp-discovery.js";

export function normalizeGoogleModelId(modelId) {
  const trimmed = typeof modelId === "string" ? modelId.trim() : "";
  if (!trimmed) {
    return "";
  }
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("models/") || lowered.startsWith("tunedmodels/")) {
    return trimmed;
  }
  return `models/${trimmed}`;
}

export function resolveLiveModelSelection({
  requestedModelId = "",
  provider = "google",
  requestedMode = "",
  benchmarkMode = false
} = {}) {
  const trimmedProvider = typeof provider === "string" ? provider.trim().toLowerCase() : "google";
  const normalizedModelId = trimmedProvider === "google"
    ? normalizeGoogleModelId(requestedModelId)
    : (typeof requestedModelId === "string" ? requestedModelId.trim() : "");
  const normalizedMode = typeof requestedMode === "string" ? requestedMode.trim().toLowerCase() : "";

  if (normalizedModelId) {
    return {
      modelId: normalizedModelId,
      mode: "manual"
    };
  }

  if (benchmarkMode && normalizedMode === "auto") {
    return {
      modelId: "auto",
      mode: "auto"
    };
  }

  return {
    modelId: trimmedProvider === "google" ? "models/gemini-2.5-flash" : "",
    mode: "manual"
  };
}

export function assertSelectedModelConfig(config, {
  provider = "google",
  mode = "manual",
  modelId = "models/gemini-2.5-flash"
} = {}) {
  const normalizedConfig = config && typeof config === "object" ? config : {};
  const selectedProvider = typeof normalizedConfig.selectedProvider === "string" ? normalizedConfig.selectedProvider : "";
  const defaultModelMode = typeof normalizedConfig.defaultModelMode === "string" ? normalizedConfig.defaultModelMode : "";
  const selectedModelId = typeof normalizedConfig.selectedModelId === "string" ? normalizedConfig.selectedModelId : "";
  const canonicalModelId = provider === "google" ? normalizeGoogleModelId(modelId) : modelId;

  if (selectedProvider !== provider) {
    throw new Error(`Expected selected provider ${provider} but found ${selectedProvider || "unset"}.`);
  }
  if (defaultModelMode !== mode) {
    throw new Error(`Expected ${mode} model mode but found ${defaultModelMode || "unset"}.`);
  }
  if (mode === "manual" && selectedModelId !== canonicalModelId) {
    throw new Error(`Expected selected model ${canonicalModelId} but found ${selectedModelId || "unset"}.`);
  }
}

export async function resolveLiveCdpWsUrl({
  explicitWsUrl = process.env.LIVE_CDP_WS_URL?.trim() || process.env.LIVE_CDP_URL?.trim() || process.env.CHROME_CDP_WS_URL?.trim() || "",
  host = process.env.CHROME_CDP_HOST?.trim() || "127.0.0.1",
  port = Number.parseInt(process.env.CHROME_CDP_PORT ?? "9555", 10) || 9555,
  portCandidates = [port, 9444, 9333, 9222],
  profileRoot = defaultChromeProfileRoot(),
  fetchImpl = globalThis.fetch,
  resolveRunningChromeWsUrlImpl = resolveRunningChromeCdpWsUrl
} = {}) {
  const uniquePorts = Array.from(new Set(
    (Array.isArray(portCandidates) ? portCandidates : [portCandidates])
      .map((candidate) => Number.parseInt(String(candidate), 10))
      .filter((candidate) => Number.isInteger(candidate) && candidate > 0)
  ));

  for (const candidatePort of uniquePorts) {
    const direct = await fetchCdpWsUrlFromPort({ host, port: candidatePort, fetchImpl });
    if (direct) {
      return direct;
    }
  }

  if (explicitWsUrl) {
    return explicitWsUrl;
  }

  let discovered;
  try {
    discovered = await resolveRunningChromeWsUrlImpl({
      profileRoot,
      host,
      fetchImpl
    });
  } catch (error) {
    const detail = formatCdpDiscoveryFailure(error);
    throw new Error(
      `Unable to resolve live CDP websocket URL. Process discovery failed (${detail}). `
      + `Checked http://${host}:${port}/json/version and running Chromium profile at ${profileRoot}.`
    );
  }
  if (discovered) {
    return discovered;
  }

  throw new Error(`Unable to resolve live CDP websocket URL from http://${host}:${port}/json/version or a running Chromium profile at ${profileRoot}`);
}

async function fetchCdpWsUrlFromPort({ host, port, fetchImpl }) {
  const response = await fetchImpl(`http://${host}:${port}/json/version`).catch(() => null);
  if (!response?.ok) {
    return undefined;
  }

  const payload = await response.json();
  return typeof payload?.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0
    ? payload.webSocketDebuggerUrl
    : undefined;
}
