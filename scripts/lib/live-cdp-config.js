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
  requestedMode = "",
  benchmarkMode = false
} = {}) {
  const normalizedModelId = normalizeGoogleModelId(requestedModelId);
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
    modelId: "models/gemini-2.5-flash",
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
  fetchImpl = globalThis.fetch
} = {}) {
  if (explicitWsUrl) {
    return explicitWsUrl;
  }

  const response = await fetchImpl(`http://${host}:${port}/json/version`);
  if (!response.ok) {
    throw new Error(`Unable to resolve live CDP websocket URL from http://${host}:${port}/json/version (HTTP ${response.status})`);
  }

  const payload = await response.json();
  if (!payload || typeof payload.webSocketDebuggerUrl !== "string" || payload.webSocketDebuggerUrl.length === 0) {
    throw new Error(`json/version did not include a Chrome websocket debugger URL for ${host}:${port}`);
  }

  return payload.webSocketDebuggerUrl;
}
