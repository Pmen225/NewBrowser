export const MODEL_CONFIG_STORAGE_KEY    = "ui.modelConfig";
export const MODEL_CATALOG_STORAGE_KEY   = "ui.modelCatalog";
export const PRICING_MANIFEST_STORAGE_KEY = "ui.pricingManifest";
export const PRICING_MANIFEST_TTL_MS     = 24 * 60 * 60 * 1000; // 24 h

const THINKING_LEVELS = ["minimal", "low", "medium", "high"];
const THINKING_RANK = THINKING_LEVELS.reduce((map, level, index) => {
  map[level] = index;
  return map;
}, Object.create(null));

const COST_RANK = {
  lowest: 0,
  low: 1,
  medium: 2,
  high: 3
};

const CAPABILITY_RANK = {
  basic: 0,
  balanced: 1,
  advanced: 2
};

// ─── Real pricing table ────────────────────────────────────────────────────
// inputPer1M / outputPer1M in USD per 1M tokens.
// Sources: Perplexity API docs (2026-03) + provider pricing pages.
// Patterns matched against normalised model ID (lowercase, "models/" stripped).
// Order matters: more-specific entries must come before broader ones.
const KNOWN_PRICING = [
  // ── xAI ──────────────────────────────────────────────────────────────────
  { pattern: /grok.*(fast|non.?reason)/i,  inputPer1M:  0.20, outputPer1M:  0.50 },
  { pattern: /grok.3.mini/i,               inputPer1M:  0.30, outputPer1M:  0.50 },
  { pattern: /grok.3.fast/i,               inputPer1M:  5.00, outputPer1M: 25.00 },
  { pattern: /grok.3/i,                    inputPer1M:  3.00, outputPer1M: 15.00 },
  // ── OpenAI ───────────────────────────────────────────────────────────────
  { pattern: /gpt.4o.mini/i,               inputPer1M:  0.15, outputPer1M:  0.60 },
  { pattern: /gpt.4\.1.mini/i,             inputPer1M:  0.40, outputPer1M:  1.60 },
  { pattern: /gpt.5.mini/i,                inputPer1M:  0.25, outputPer1M:  2.00 },
  { pattern: /o[13].mini/i,                inputPer1M:  1.10, outputPer1M:  4.40 },
  { pattern: /gpt.5\.1/i,                  inputPer1M:  1.25, outputPer1M: 10.00 },
  { pattern: /gpt.4\.1(?!.mini)/i,         inputPer1M:  2.00, outputPer1M:  8.00 },
  { pattern: /gpt.4o(?!.mini)/i,           inputPer1M:  2.50, outputPer1M: 10.00 },
  { pattern: /gpt.5\.2/i,                  inputPer1M:  1.75, outputPer1M: 14.00 },
  { pattern: /gpt.5(?![.\d])/i,            inputPer1M:  1.75, outputPer1M: 14.00 },
  { pattern: /\bo3\b/i,                    inputPer1M: 10.00, outputPer1M: 40.00 },
  { pattern: /\bo1\b/i,                    inputPer1M: 15.00, outputPer1M: 60.00 },
  // ── Google ───────────────────────────────────────────────────────────────
  { pattern: /gemini.2\.0.flash.lite/i,    inputPer1M:  0.075, outputPer1M:  0.30 },
  { pattern: /gemini.1\.5.flash/i,         inputPer1M:  0.075, outputPer1M:  0.30 },
  { pattern: /gemini.2\.0.flash/i,         inputPer1M:  0.10,  outputPer1M:  0.40 },
  { pattern: /gemini.2\.5.flash/i,         inputPer1M:  0.30,  outputPer1M:  2.50 },
  { pattern: /gemini.3.*flash/i,           inputPer1M:  0.50,  outputPer1M:  3.00 },
  { pattern: /gemini.1\.5.pro/i,           inputPer1M:  1.25,  outputPer1M:  5.00 },
  { pattern: /gemini.2\.5.pro/i,           inputPer1M:  1.25,  outputPer1M: 10.00 },
  { pattern: /gemini.3.*pro/i,             inputPer1M:  2.00,  outputPer1M: 12.00 },
  // ── Anthropic ────────────────────────────────────────────────────────────
  { pattern: /claude.3.*haiku/i,           inputPer1M:  0.80,  outputPer1M:  4.00 },
  { pattern: /claude.haiku/i,              inputPer1M:  1.00,  outputPer1M:  5.00 },
  { pattern: /claude.(3\.5|3\.6).*sonnet/i,inputPer1M:  3.00,  outputPer1M: 15.00 },
  { pattern: /claude.sonnet/i,             inputPer1M:  3.00,  outputPer1M: 15.00 },
  { pattern: /claude.3.opus/i,             inputPer1M: 15.00,  outputPer1M: 75.00 },
  { pattern: /claude.opus/i,               inputPer1M:  5.00,  outputPer1M: 25.00 },
  // ── Perplexity ───────────────────────────────────────────────────────────
  { pattern: /sonar.pro/i,                 inputPer1M:  3.00,  outputPer1M: 15.00 },
  { pattern: /sonar/i,                     inputPer1M:  0.25,  outputPer1M:  2.50 },
  // ── DeepSeek ─────────────────────────────────────────────────────────────
  { pattern: /deepseek.reasoner/i,         inputPer1M:  0.55,  outputPer1M:  2.19 },
  { pattern: /deepseek/i,                  inputPer1M:  0.27,  outputPer1M:  1.10 },
];

// Effective price for auto-selection: agent workloads are input-heavy
// (large system prompts + page content), so we weight input 70 / output 30.
function effectivePriceOf(entry) {
  if (typeof entry.inputPricePerMToken === "number" && typeof entry.outputPricePerMToken === "number") {
    return entry.inputPricePerMToken * 0.7 + entry.outputPricePerMToken * 0.3;
  }
  // Fallback: costTier bucket prices (rough estimate for unlisted models)
  return { lowest: 0.15, low: 0.60, medium: 2.00, high: 8.00 }[entry.costTier] ?? 2.00;
}

function lookupModelPrice(id) {
  const normalized = String(id).replace(/^models\//, "").toLowerCase();
  for (const entry of KNOWN_PRICING) {
    if (entry.pattern.test(normalized)) {
      return { inputPer1M: entry.inputPer1M, outputPer1M: entry.outputPer1M };
    }
  }
  return null;
}

function priceToCostTier(inputPer1M) {
  if (inputPer1M <= 0.15) return "lowest";
  if (inputPer1M <= 1.00) return "low";
  if (inputPer1M <= 3.00) return "medium";
  return "high";
}

function normalizeThinkingLevel(level) {
  const normalized = typeof level === "string" ? level.trim().toLowerCase() : "";
  return THINKING_LEVELS.includes(normalized) ? normalized : "high";
}

function clampThinkingLevel(requested, maximum) {
  const requestedRank = THINKING_RANK[normalizeThinkingLevel(requested)];
  const maximumRank = THINKING_RANK[normalizeThinkingLevel(maximum)];
  return THINKING_LEVELS[Math.min(requestedRank, maximumRank)];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function modelKey(provider, id) {
  return `${provider}::${id}`;
}

function titleCaseToken(token) {
  return token
    .split(/[-_/]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveDisplayName(id) {
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (!trimmed) {
    return "Custom model";
  }
  const leaf = trimmed.includes("/") ? trimmed.split("/").pop() : trimmed;
  return titleCaseToken(leaf || trimmed);
}

function inferCapabilities(provider, id) {
  const normalizedId = `${provider}:${id}`.toLowerCase();
  const isGoogle = provider === "google";
  const likelyVision = /gemini|4o|vision|omni|sonnet|opus/.test(normalizedId);
  const likelySearch = /gemini|gpt|claude|deepseek/.test(normalizedId);

  return {
    inputModalities: likelyVision ? ["text", "vision"] : ["text"],
    supportsTools: true,
    supportsFunctionCalling: true,
    supportsCodeExecution: isGoogle,
    supportsBrowserSearch: likelySearch,
    supportsThinking: true,
    maxThinkingLevel: "high",
    costTier: isGoogle && /flash/.test(normalizedId) ? "low" : /mini|haiku|flash/.test(normalizedId) ? "lowest" : "medium",
    capabilityTier: /pro|opus|reasoner/.test(normalizedId) ? "advanced" : "balanced",
    safetyProfileDefault: isGoogle ? "low" : "provider_default"
  };
}

export function normalizeModelConfig(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    defaultModelMode: value.defaultModelMode === "manual" ? "manual" : "auto",
    selectedProvider: typeof value.selectedProvider === "string" && value.selectedProvider.trim().length > 0 ? value.selectedProvider.trim() : "auto",
    selectedModelId: typeof value.selectedModelId === "string" && value.selectedModelId.trim().length > 0 ? value.selectedModelId.trim() : "auto",
    thinkingLevel: normalizeThinkingLevel(value.thinkingLevel),
    syncModelsOnStartup: value.syncModelsOnStartup !== false,
    lowSafetyForGemini: value.lowSafetyForGemini !== false,
    enableFunctionCalling: value.enableFunctionCalling !== false,
    enableCodeExecution: value.enableCodeExecution !== false,
    allowVision: value.allowVision !== false,
    allowBrowserSearch: value.allowBrowserSearch !== false
  };
}

export function createCatalogEntry(provider, id, overrides = {}) {
  const base    = inferCapabilities(provider, id);
  const pricing = lookupModelPrice(id);
  const inputModalities = toArray(overrides.inputModalities).filter((item) => item === "text" || item === "vision");

  // Prefer real pricing → override → heuristic
  const inputPricePerMToken  = typeof overrides.inputPricePerMToken  === "number" ? overrides.inputPricePerMToken  : pricing?.inputPer1M  ?? null;
  const outputPricePerMToken = typeof overrides.outputPricePerMToken === "number" ? overrides.outputPricePerMToken : pricing?.outputPer1M ?? null;
  // Derive costTier from real price when available
  const baseCostTier = inputPricePerMToken != null ? priceToCostTier(inputPricePerMToken) : base.costTier;

  return {
    id,
    provider,
    displayName: typeof overrides.displayName === "string" && overrides.displayName.trim().length > 0 ? overrides.displayName.trim() : deriveDisplayName(id),
    source: overrides.source === "manual" ? "manual" : "provider_sync",
    inputModalities: inputModalities.length > 0 ? [...new Set(inputModalities)] : base.inputModalities,
    supportsTools: overrides.supportsTools ?? base.supportsTools,
    supportsFunctionCalling: overrides.supportsFunctionCalling ?? base.supportsFunctionCalling,
    supportsCodeExecution: overrides.supportsCodeExecution ?? base.supportsCodeExecution,
    supportsBrowserSearch: overrides.supportsBrowserSearch ?? base.supportsBrowserSearch,
    supportsThinking: overrides.supportsThinking ?? base.supportsThinking,
    maxThinkingLevel: normalizeThinkingLevel(overrides.maxThinkingLevel ?? base.maxThinkingLevel),
    costTier: overrides.costTier in COST_RANK ? overrides.costTier : baseCostTier,
    capabilityTier: overrides.capabilityTier in CAPABILITY_RANK ? overrides.capabilityTier : base.capabilityTier,
    safetyProfileDefault: overrides.safetyProfileDefault === "low" ? "low" : base.safetyProfileDefault,
    enabled: overrides.enabled !== false,
    syncedAt: typeof overrides.syncedAt === "string" ? overrides.syncedAt : undefined,
    inputPricePerMToken,
    outputPricePerMToken,
  };
}

export function normalizeModelCatalog(raw) {
  const entries = [];
  const seen = new Set();
  for (const entry of toArray(raw)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const provider = typeof entry.provider === "string" && entry.provider.trim().length > 0 ? entry.provider.trim() : "";
    const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : "";
    if (!provider || !id) {
      continue;
    }

    const key = modelKey(provider, id);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push(createCatalogEntry(provider, id, entry));
  }

  return entries.sort((left, right) => {
    if (left.source !== right.source) {
      return left.source === "manual" ? -1 : 1;
    }
    if (left.provider !== right.provider) {
      return left.provider.localeCompare(right.provider);
    }
    return left.id.localeCompare(right.id);
  });
}

export function upsertManualModel(existingCatalog, draft) {
  const catalog = normalizeModelCatalog(existingCatalog);
  const provider = typeof draft?.provider === "string" && draft.provider.trim().length > 0 ? draft.provider.trim() : "";
  const id = typeof draft?.id === "string" && draft.id.trim().length > 0 ? draft.id.trim() : "";
  if (!provider || !id) {
    return catalog;
  }

  const next = catalog.filter((entry) => modelKey(entry.provider, entry.id) !== modelKey(provider, id));
  next.push(createCatalogEntry(provider, id, {
    ...draft,
    source: "manual"
  }));
  return normalizeModelCatalog(next);
}

export function deleteManualModel(existingCatalog, provider, id) {
  return normalizeModelCatalog(existingCatalog).filter((entry) => (
    !(entry.source === "manual" && entry.provider === provider && entry.id === id)
  ));
}

export function buildTaskCapabilityRequest({ prompt = "", activeMode = "ask", hasImageInput = false } = {}) {
  const normalizedPrompt = typeof prompt === "string" ? prompt.toLowerCase() : "";
  const active = typeof activeMode === "string" ? activeMode.toLowerCase() : "ask";

  return {
    usesScreenshotInput: hasImageInput || /\bscreenshot\b/.test(normalizedPrompt),
    requiresVision: hasImageInput || /\b(image|screenshot|photo|picture|look at|see this)\b/.test(normalizedPrompt),
    requiresBrowserControl: active === "control",
    requiresFunctionCalling: active === "control",
    requiresCodeExecution: /\b(code|python|script|calculate|computation|execute)\b/.test(normalizedPrompt),
    requiresSearch: active === "research" || /\b(search|compare|latest|find sources)\b/.test(normalizedPrompt),
    requiresBrowserSearch: active === "research"
  };
}

export function chooseAutoModel(existingCatalog, request, rawConfig) {
  const catalog = normalizeModelCatalog(existingCatalog).filter((entry) => entry.enabled !== false);
  const config = normalizeModelConfig(rawConfig);
  const needs = {
    requiresVision: request?.requiresVision === true,
    requiresFunctionCalling: request?.requiresFunctionCalling === true,
    requiresCodeExecution: request?.requiresCodeExecution === true,
    requiresBrowserSearch: request?.requiresBrowserSearch === true
  };

  if (needs.requiresVision && !config.allowVision) {
    return null;
  }
  if (needs.requiresFunctionCalling && !config.enableFunctionCalling) {
    return null;
  }
  if (needs.requiresCodeExecution && !config.enableCodeExecution) {
    return null;
  }
  if (needs.requiresBrowserSearch && !config.allowBrowserSearch) {
    return null;
  }

  const eligible = catalog.filter((entry) => {
    if (config.selectedProvider !== "auto" && entry.provider !== config.selectedProvider) {
      return false;
    }
    if (needs.requiresVision && !entry.inputModalities.includes("vision")) {
      return false;
    }
    if (needs.requiresFunctionCalling && !entry.supportsFunctionCalling) {
      return false;
    }
    if (needs.requiresCodeExecution && !entry.supportsCodeExecution) {
      return false;
    }
    if (needs.requiresBrowserSearch && !entry.supportsBrowserSearch) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return null;
  }

  eligible.sort((left, right) => {
    // Primary: cheapest effective price (real $/1M when known, tier fallback otherwise)
    const priceDelta = effectivePriceOf(left) - effectivePriceOf(right);
    if (Math.abs(priceDelta) > 0.001) return priceDelta;
    // Tiebreak: prefer more capable model
    const capabilityDelta = CAPABILITY_RANK[right.capabilityTier] - CAPABILITY_RANK[left.capabilityTier];
    if (capabilityDelta !== 0) return capabilityDelta;
    if (left.provider !== right.provider) return left.provider.localeCompare(right.provider);
    return left.id.localeCompare(right.id);
  });

  const chosen = eligible[0];
  return {
    chosenProvider: chosen.provider,
    chosenModelId: chosen.id,
    thinkingLevel: clampThinkingLevel(config.thinkingLevel, chosen.maxThinkingLevel),
    reason: `lowest-cost eligible model selected from ${eligible.length} candidates`,
    requirementsMatched: {
      vision: !needs.requiresVision || chosen.inputModalities.includes("vision"),
      functionCalling: !needs.requiresFunctionCalling || chosen.supportsFunctionCalling,
      codeExecution: !needs.requiresCodeExecution || chosen.supportsCodeExecution,
      browserSearch: !needs.requiresBrowserSearch || chosen.supportsBrowserSearch
    }
  };
}

function mergeProviderModels(existingCatalog, provider, models, syncedAt) {
  const catalog = normalizeModelCatalog(existingCatalog);
  const preserved = catalog.filter((entry) => (
    entry.source === "manual" || entry.provider !== provider
  ));

  const syncedEntries = models.map((id) => createCatalogEntry(provider, id, {
    source: "provider_sync",
    syncedAt
  }));

  return normalizeModelCatalog(preserved.concat(syncedEntries));
}

export async function syncModelCatalogs({
  existingCatalog,
  unlockedProviders,
  listModels,
  now = new Date().toISOString()
}) {
  let catalog = normalizeModelCatalog(existingCatalog);
  const results = [];

  for (const providerEntry of toArray(unlockedProviders)) {
    if (!providerEntry || typeof providerEntry !== "object") {
      continue;
    }

    const provider = typeof providerEntry.provider === "string" ? providerEntry.provider : "";
    const apiKey = typeof providerEntry.apiKey === "string" ? providerEntry.apiKey : "";
    if (!provider || !apiKey) {
      continue;
    }

    try {
      const payload = await listModels({
        provider,
        api_key: apiKey,
        base_url: typeof providerEntry.baseUrl === "string" ? providerEntry.baseUrl : undefined
      });
      const models = Array.isArray(payload?.models) ? payload.models.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
      catalog = mergeProviderModels(catalog, provider, models, now);
      results.push({
        provider,
        ok: true,
        syncedAt: now,
        models
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        provider,
        ok: false,
        syncedAt: now,
        errorMessage: message
      });
    }
  }

  return {
    catalog,
    results
  };
}

// ─── OpenRouter pricing manifest ──────────────────────────────────────────
// `openRouterModels` is the `data` array from GET https://openrouter.ai/api/v1/models
// Each item: { id: "anthropic/claude-opus-4-6", pricing: { prompt: "0.000005", completion: "0.000025" } }
// Prices are per-token; we convert to per-1M.
export function applyPricingManifest(catalog, openRouterModels) {
  if (!Array.isArray(openRouterModels) || openRouterModels.length === 0) return catalog;

  // Build map: normalized OpenRouter model leaf -> { inputPricePerMToken, outputPricePerMToken }
  // Key format: "provider::model-leaf" (provider lowercase, models/ stripped from id)
  const priceMap = new Map();
  for (const m of openRouterModels) {
    if (!m?.id || !m?.pricing) continue;
    const inputPer1M  = parseFloat(m.pricing.prompt)     * 1_000_000;
    const outputPer1M = parseFloat(m.pricing.completion) * 1_000_000;
    if (!isFinite(inputPer1M) || inputPer1M < 0) continue;
    const [orProv, ...rest] = m.id.split("/");
    const orLeaf = rest.join("/").toLowerCase();
    if (!orProv || !orLeaf) continue;
    priceMap.set(`${orProv.toLowerCase()}::${orLeaf}`, { inputPer1M, outputPer1M });
  }

  return catalog.map(entry => {
    const ourLeaf = entry.id.replace(/^models\//, "").toLowerCase();
    const exactKey = `${entry.provider.toLowerCase()}::${ourLeaf}`;

    let found = priceMap.get(exactKey);

    if (!found) {
      // Prefix match: handle versioned names (e.g. "claude-opus-4-5-20251022" vs "claude-opus-4-5")
      for (const [key, p] of priceMap) {
        const [kProv, kLeaf] = key.split("::");
        if (kProv !== entry.provider.toLowerCase()) continue;
        if (kLeaf && (kLeaf.startsWith(ourLeaf) || ourLeaf.startsWith(kLeaf))) {
          found = p;
          break;
        }
      }
    }

    if (!found) return entry;

    return {
      ...entry,
      inputPricePerMToken:  found.inputPer1M,
      outputPricePerMToken: found.outputPer1M,
      costTier: priceToCostTier(found.inputPer1M),
    };
  });
}
