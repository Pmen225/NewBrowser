import { chooseAutoModel, normalizeModelBenchmarkManifest, normalizeModelCatalog, normalizeModelConfig } from "./model-config.js";

const VALID_PROVIDERS = new Set(["openai", "anthropic", "google", "deepseek"]);

function canonicalizeProvider(provider) {
  const normalized = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  if (normalized === "gemini") {
    return "google";
  }
  return normalized;
}

function normalizeSession(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const provider = canonicalizeProvider(entry.provider);
  const apiKey = typeof entry.apiKey === "string" ? entry.apiKey.trim() : "";
  if (!provider) {
    return null;
  }

  return {
    provider,
    apiKey,
    baseUrl: typeof entry.baseUrl === "string" && entry.baseUrl.trim().length > 0 ? entry.baseUrl.trim() : undefined,
    preferredModel: typeof entry.preferredModel === "string" ? entry.preferredModel.trim() : ""
  };
}

function normalizeProvider(provider) {
  const normalized = canonicalizeProvider(provider);
  return VALID_PROVIDERS.has(normalized) ? normalized : "google";
}

function titleCaseProvider(provider) {
  const normalized = normalizeProvider(provider);
  if (normalized === "openai") return "OpenAI";
  if (normalized === "deepseek") return "DeepSeek";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function buildMissingProviderSessionMessage(provider) {
  const label = titleCaseProvider(provider);
  return `${label} is selected, but ${label} is not ready in Settings yet.`;
}

export function resolveProviderSelection({
  config = {},
  catalog = [],
  benchmarkManifest = {},
  sessions = [],
  taskRequest = {}
} = {}) {
  const normalizedConfig = normalizeModelConfig(config);
  const normalizedCatalog = normalizeModelCatalog(catalog);
  const normalizedBenchmarkManifest = normalizeModelBenchmarkManifest(benchmarkManifest);
  const normalizedSessions = Array.isArray(sessions)
    ? sessions.map(normalizeSession).filter(Boolean)
    : [];
  const selectedProvider =
    typeof normalizedConfig.selectedProvider === "string" && normalizedConfig.selectedProvider.trim().length > 0
      ? normalizedConfig.selectedProvider.trim().toLowerCase()
      : "auto";

  let provider = normalizeProvider(normalizedConfig.selectedProvider ?? "google");
  let model = normalizedConfig.selectedModelId ?? "auto";
  let mode = normalizedConfig.defaultModelMode === "auto" ? "auto" : "manual";

  if (mode === "auto" && normalizedCatalog.length > 0) {
    const sessionProviders = new Set(normalizedSessions.map((entry) => entry.provider));
    const sessionScopedCatalog = sessionProviders.size > 0
      ? normalizedCatalog.filter((entry) => sessionProviders.has(normalizeProvider(entry.provider)))
      : normalizedCatalog;
    const chosen = chooseAutoModel(
      sessionScopedCatalog.length > 0 ? sessionScopedCatalog : normalizedCatalog,
      taskRequest,
      normalizedConfig,
      normalizedBenchmarkManifest
    );
    if (chosen) {
      provider = normalizeProvider(chosen.chosenProvider);
      model = chosen.chosenModelId;
    }
  }

  if (mode === "auto" && normalizedCatalog.length === 0 && selectedProvider === "auto" && normalizedSessions.length > 0) {
    const [session] = normalizedSessions;
    provider = normalizeProvider(session.provider);
    model = session.preferredModel || "auto";
  }

  const session = normalizedSessions.find((entry) => entry.provider === provider) ?? null;
  return {
    provider,
    model,
    apiKey: session?.apiKey ?? "",
    baseUrl: session?.baseUrl,
    missingProviderSession: !session
  };
}
