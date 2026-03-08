import { normalizeCatalogModelId, normalizeModelCatalog, normalizeModelConfig } from "./model-config.js";
import { buildMissingProviderSessionMessage, resolveProviderSelection } from "./provider-resolution.js";

const PROVIDER_LABELS = Object.freeze({
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek"
});

const CURATED_TRANSCRIPTION_MODELS = Object.freeze({
  openai: Object.freeze([
    { id: "gpt-4o-mini-transcribe", label: "GPT-4o mini transcribe" },
    { id: "gpt-4o-transcribe", label: "GPT-4o transcribe" },
    { id: "whisper-1", label: "Whisper-1" }
  ]),
  google: Object.freeze([
    { id: "models/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "models/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "models/gemini-flash-latest", label: "Gemini Flash Latest" }
  ])
});

export function getTranscriptionProviderLabel(provider) {
  const normalized = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  return PROVIDER_LABELS[normalized] ?? "Provider";
}

export function providerSupportsTranscription(provider) {
  return provider === "openai" || provider === "google";
}

export function isTranscriptionModelSupported(provider, modelId) {
  const normalizedProvider = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  const canonicalModelId = normalizeCatalogModelId(normalizedProvider, modelId).toLowerCase();
  if (!canonicalModelId || !providerSupportsTranscription(normalizedProvider)) {
    return false;
  }

  if (normalizedProvider === "openai") {
    return (
      canonicalModelId === "whisper-1" ||
      canonicalModelId === "gpt-4o-mini-transcribe" ||
      canonicalModelId === "gpt-4o-transcribe" ||
      canonicalModelId.includes("transcribe")
    );
  }

  if (normalizedProvider === "google") {
    return canonicalModelId.includes("gemini") && !/(?:image|embedding|tts|veo|imagen)/.test(canonicalModelId);
  }

  return false;
}

export function resolveTranscriptionModelForProvider(provider, candidateModelId = "auto") {
  const normalizedProvider = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  if (!providerSupportsTranscription(normalizedProvider)) {
    return "";
  }

  const candidate = typeof candidateModelId === "string" ? candidateModelId.trim() : "";
  if (candidate && candidate.toLowerCase() !== "auto" && isTranscriptionModelSupported(normalizedProvider, candidate)) {
    return normalizeCatalogModelId(normalizedProvider, candidate);
  }

  return CURATED_TRANSCRIPTION_MODELS[normalizedProvider][0]?.id ?? "";
}

export function listTranscriptionModelsForProvider(provider, catalog = [], selectedModelId = "auto") {
  const normalizedProvider = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  if (!providerSupportsTranscription(normalizedProvider)) {
    return [];
  }

  const options = [];
  const seen = new Set();
  const addOption = (id, label, source) => {
    const canonicalId = normalizeCatalogModelId(normalizedProvider, id);
    if (!canonicalId || seen.has(canonicalId) || !isTranscriptionModelSupported(normalizedProvider, canonicalId)) {
      return;
    }
    seen.add(canonicalId);
    options.push({ id: canonicalId, label, source });
  };

  const selected = typeof selectedModelId === "string" ? selectedModelId.trim() : "";
  if (selected && selected.toLowerCase() !== "auto") {
    addOption(selected, selected, "selected");
  }

  for (const entry of CURATED_TRANSCRIPTION_MODELS[normalizedProvider] ?? []) {
    addOption(entry.id, entry.label, "curated");
  }

  const normalizedCatalog = normalizeModelCatalog(catalog)
    .filter((entry) => entry.provider === normalizedProvider && entry.enabled !== false)
    .filter((entry) => isTranscriptionModelSupported(normalizedProvider, entry.id));

  for (const entry of normalizedCatalog) {
    addOption(entry.id, entry.displayName || entry.id, entry.source);
  }

  return options;
}

export function resolveTranscriptionConfig({
  panelSettings = {},
  modelConfig = {},
  catalog = [],
  sessions = []
} = {}) {
  const normalizedSettings = panelSettings && typeof panelSettings === "object" ? panelSettings : {};
  const resolvedProvider = resolveProviderSelection({
    config: normalizeModelConfig(modelConfig),
    catalog,
    sessions
  });
  const requestedProvider =
    typeof normalizedSettings.transcriptionProvider === "string" && normalizedSettings.transcriptionProvider.trim().length > 0
      ? normalizedSettings.transcriptionProvider.trim().toLowerCase()
      : "auto";
  const explicitProvider = requestedProvider !== "auto" ? requestedProvider : "";
  const provider = explicitProvider || resolvedProvider.provider;
  const providerLabel = getTranscriptionProviderLabel(provider);
  const normalizedSessions = Array.isArray(sessions)
    ? sessions.filter((entry) => entry && typeof entry === "object")
    : [];
  const explicitSession = explicitProvider
    ? normalizedSessions.find((entry) => typeof entry.provider === "string" && entry.provider.trim().toLowerCase() === explicitProvider) ?? null
    : null;
  const storedModelId =
    typeof normalizedSettings.transcriptionModelId === "string" && normalizedSettings.transcriptionModelId.trim().length > 0
      ? normalizedSettings.transcriptionModelId.trim()
      : "auto";
  const supported = providerSupportsTranscription(provider);
  const availableModels = listTranscriptionModelsForProvider(provider, catalog, storedModelId);
  const resolvedModelId = supported ? resolveTranscriptionModelForProvider(provider, storedModelId) : "";
  let status = "ready";
  let message = `Uses your saved ${providerLabel} key from General.`;

  if (!supported) {
    status = "unsupported_provider";
    message = `${providerLabel} does not support speech-to-text in this build. Switch the active provider to OpenAI or Google.`;
  } else if ((explicitProvider && !explicitSession) || (!explicitProvider && resolvedProvider.missingProviderSession)) {
    status = "missing_provider_session";
    message = buildMissingProviderSessionMessage(provider);
  } else if (availableModels.length === 0) {
    status = "no_models";
    message = `No compatible ${providerLabel} speech models are available right now.`;
  }

  return {
    provider,
    providerLabel,
    supported,
    status,
    message,
    selectedModelId: storedModelId === "auto" ? "auto" : resolvedModelId,
    resolvedModelId,
    availableModels,
    apiKey: explicitProvider ? (explicitSession?.apiKey ?? "") : resolvedProvider.apiKey,
    baseUrl: explicitProvider ? explicitSession?.baseUrl : resolvedProvider.baseUrl,
    missingProviderSession: explicitProvider ? !explicitSession : resolvedProvider.missingProviderSession,
    providerMode: explicitProvider ? "explicit" : "auto",
    language:
      typeof normalizedSettings.transcriptionLanguage === "string" && normalizedSettings.transcriptionLanguage.trim().length > 0
        ? normalizedSettings.transcriptionLanguage.trim()
        : ""
  };
}
