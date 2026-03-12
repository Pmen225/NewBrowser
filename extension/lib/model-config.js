export const MODEL_CONFIG_STORAGE_KEY    = "ui.modelConfig";
export const MODEL_CATALOG_STORAGE_KEY   = "ui.modelCatalog";
export const MODEL_BENCHMARK_STORAGE_KEY = "ui.modelBenchmarkManifest";
export const PRICING_MANIFEST_STORAGE_KEY = "ui.pricingManifest";
export const PRICING_MANIFEST_TTL_MS     = 24 * 60 * 60 * 1000; // 24 h
export const AGENT_CONFIG_STORAGE_KEY    = "ui.agentConfig";

export function normalizeAgentConfig(raw) {
  const v = raw && typeof raw === "object" ? raw : {};
  return {
    maxStepsPerTask:        typeof v.maxStepsPerTask        === "number" && v.maxStepsPerTask > 0   ? Math.round(v.maxStepsPerTask)        : 1000,
    maxActionsPerStep:      typeof v.maxActionsPerStep      === "number" && v.maxActionsPerStep > 0  ? Math.round(v.maxActionsPerStep)      : 1000,
    failureTolerance:       typeof v.failureTolerance       === "number" && v.failureTolerance >= 0  ? Math.round(v.failureTolerance)       : 10,
    enableVision:           v.enableVision           === true,
    displayHighlights:      v.displayHighlights      !== false,
    replanningFrequency:    typeof v.replanningFrequency    === "number" && v.replanningFrequency > 0 ? Math.round(v.replanningFrequency)   : 10,
    pageLoadWaitTimeMs:     typeof v.pageLoadWaitTimeMs     === "number" ? Math.max(250, Math.min(5000, Math.round(v.pageLoadWaitTimeMs))) : 250,
    replayHistoricalTasks:  v.replayHistoricalTasks  !== false
  };
}

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

export const GOOGLE_VISIBLE_MODEL_IDS = Object.freeze([
  "models/gemini-flash-latest",
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro",
  "models/gemini-3-pro-preview",
  "models/gemini-3.1-pro-preview",
  "models/gemini-2.5-flash-image"
]);

export const GOOGLE_REMOVED_MODEL_IDS = Object.freeze([
  "models/gemini-flash-lite-latest",
  "models/gemini-2.5-flash-lite",
  "models/gemini-3-flash-preview",
  "models/gemini-3.1-flash-lite-preview"
]);

export const GOOGLE_BROWSER_BENCHMARK_MODEL_IDS = Object.freeze(
  GOOGLE_VISIBLE_MODEL_IDS.filter((id) => id !== "models/gemini-2.5-flash-image")
);

const GOOGLE_BROWSER_BENCHMARK_MODEL_SET = new Set(GOOGLE_BROWSER_BENCHMARK_MODEL_IDS);
const GOOGLE_BROWSER_CONTROL_AUTO_RANK = Object.freeze([
  "models/gemini-2.5-flash",
  "models/gemini-flash-latest",
  "models/gemini-2.5-pro",
  "models/gemini-3-pro-preview",
  "models/gemini-3.1-pro-preview"
]);
const GOOGLE_BROWSER_CONTROL_AUTO_RANK_MAP = GOOGLE_BROWSER_CONTROL_AUTO_RANK.reduce((map, modelId, index) => {
  map[modelId] = index;
  return map;
}, Object.create(null));
const GOOGLE_REMOVED_MODEL_SET = new Set(GOOGLE_REMOVED_MODEL_IDS);

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
  { pattern: /gemini.flash.lite.latest/i,  inputPer1M:  0.10,  outputPer1M:  0.40 },
  { pattern: /gemini.2\.5.flash.lite/i,    inputPer1M:  0.10,  outputPer1M:  0.40 },
  { pattern: /gemini.2\.0.flash/i,         inputPer1M:  0.10,  outputPer1M:  0.40 },
  { pattern: /gemini.3\.1.flash.lite.preview/i, inputPer1M:  0.25, outputPer1M:  1.50 },
  { pattern: /gemini.2\.5.flash.image/i,   inputPer1M:  0.30,  outputPer1M:  2.50 },
  { pattern: /gemini.flash.latest/i,       inputPer1M:  0.30,  outputPer1M:  2.50 },
  { pattern: /gemini.2\.5.flash/i,         inputPer1M:  0.30,  outputPer1M:  2.50 },
  { pattern: /gemini.3.flash.preview/i,    inputPer1M:  0.50,  outputPer1M:  3.00 },
  { pattern: /gemini.3.*flash/i,           inputPer1M:  0.50,  outputPer1M:  3.00 },
  { pattern: /gemini.1\.5.pro/i,           inputPer1M:  1.25,  outputPer1M:  5.00 },
  { pattern: /gemini.2\.5.pro/i,           inputPer1M:  1.25,  outputPer1M: 10.00 },
  { pattern: /gemini.3\.1.pro.preview/i,   inputPer1M:  2.00,  outputPer1M: 12.00 },
  { pattern: /gemini.3.pro.preview/i,      inputPer1M:  2.00,  outputPer1M: 12.00 },
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

function benchmarkModelKey(provider, modelId) {
  return `${provider}::${normalizeCatalogModelId(provider, modelId)}`;
}

function isCatalogModelAllowed(provider, id) {
  if (provider !== "google") {
    return true;
  }
  return !GOOGLE_REMOVED_MODEL_SET.has(normalizeCatalogModelId(provider, id));
}

export function normalizeCatalogModelId(provider, id) {
  const normalizedProvider = typeof provider === "string" ? provider.trim().toLowerCase() : "";
  const trimmedId = typeof id === "string" ? id.trim() : "";
  if (!trimmedId) {
    return "";
  }
  if (normalizedProvider !== "google") {
    return trimmedId;
  }
  const lowered = trimmedId.toLowerCase();
  if (lowered.startsWith("models/") || lowered.startsWith("tunedmodels/")) {
    return trimmedId;
  }
  return `models/${trimmedId}`;
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
  const canonicalId = normalizeCatalogModelId(provider, id);
  const normalizedId = `${provider}:${canonicalId}`.toLowerCase();
  const isGoogle = provider === "google";
  const isGoogleImageModel = isGoogle && /gemini.2\.5.flash.image/.test(normalizedId);
  const isFlashLite = /flash.lite/.test(normalizedId);
  const likelyVision = isGoogleImageModel || /gemini|4o|vision|omni|sonnet|opus/.test(normalizedId);
  const likelySearch = !isGoogleImageModel && /gemini|gpt|claude|deepseek/.test(normalizedId);

  return {
    inputModalities: likelyVision ? ["text", "vision"] : ["text"],
    supportsTools: !isGoogleImageModel,
    supportsFunctionCalling: !isGoogleImageModel,
    supportsCodeExecution: isGoogle && !isGoogleImageModel,
    supportsBrowserSearch: likelySearch,
    supportsThinking: !isGoogleImageModel,
    maxThinkingLevel: isFlashLite ? "medium" : "high",
    costTier: isGoogle && isFlashLite ? "lowest" : isGoogle && /flash/.test(normalizedId) ? "low" : /mini|haiku|flash/.test(normalizedId) ? "lowest" : "medium",
    capabilityTier: isGoogleImageModel ? "basic" : /pro|opus|reasoner/.test(normalizedId) ? "advanced" : isFlashLite ? "basic" : "balanced",
    safetyProfileDefault: isGoogle ? "low" : "provider_default"
  };
}

export function normalizeModelConfig(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const selectedProvider = typeof value.selectedProvider === "string" && value.selectedProvider.trim().length > 0 ? value.selectedProvider.trim() : "auto";
  const selectedModelId = typeof value.selectedModelId === "string" && value.selectedModelId.trim().length > 0 ? value.selectedModelId.trim() : "auto";
  const canonicalSelectedModelId = normalizeCatalogModelId(selectedProvider, selectedModelId);
  const sanitizedSelectedModelId = selectedProvider === "google" && GOOGLE_REMOVED_MODEL_SET.has(canonicalSelectedModelId)
    ? "models/gemini-2.5-flash"
    : selectedModelId;
  return {
    defaultModelMode: value.defaultModelMode === "manual" ? "manual" : "auto",
    selectedProvider,
    selectedModelId: sanitizedSelectedModelId,
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
  const canonicalId = normalizeCatalogModelId(provider, id);
  const base    = inferCapabilities(provider, canonicalId);
  const pricing = lookupModelPrice(canonicalId);
  const inputModalities = toArray(overrides.inputModalities).filter((item) => item === "text" || item === "vision");

  // Prefer real pricing → override → heuristic
  const inputPricePerMToken  = typeof overrides.inputPricePerMToken  === "number" ? overrides.inputPricePerMToken  : pricing?.inputPer1M  ?? null;
  const outputPricePerMToken = typeof overrides.outputPricePerMToken === "number" ? overrides.outputPricePerMToken : pricing?.outputPer1M ?? null;
  // Derive costTier from real price when available
  const baseCostTier = inputPricePerMToken != null ? priceToCostTier(inputPricePerMToken) : base.costTier;

  return {
    id: canonicalId,
    provider,
    displayName: typeof overrides.displayName === "string" && overrides.displayName.trim().length > 0 ? overrides.displayName.trim() : deriveDisplayName(canonicalId),
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

    const canonicalId = normalizeCatalogModelId(provider, id);
    if (!isCatalogModelAllowed(provider, canonicalId)) {
      continue;
    }
    const key = modelKey(provider, canonicalId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push(createCatalogEntry(provider, canonicalId, entry));
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

function normalizeBenchmarkStatus(value) {
  return value === "approved" || value === "blocked" ? value : "experimental";
}

function normalizeFailureModes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeBenchmarkMetrics(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const passCount = Number.isFinite(value.passCount) ? Math.max(0, Math.round(value.passCount)) : 0;
  const totalCount = Number.isFinite(value.totalCount) ? Math.max(0, Math.round(value.totalCount)) : 0;
  const hardFailureCount = Number.isFinite(value.hardFailureCount) ? Math.max(0, Math.round(value.hardFailureCount)) : 0;
  const medianElapsedMs = Number.isFinite(value.medianElapsedMs) ? Math.max(0, Math.round(value.medianElapsedMs)) : 0;
  return {
    benchmarkKind: typeof value.benchmarkKind === "string" && value.benchmarkKind.trim().length > 0 ? value.benchmarkKind.trim() : "gemini-browser-control-course",
    generatedAt: typeof value.generatedAt === "string" && value.generatedAt.trim().length > 0 ? value.generatedAt : undefined,
    outputDir: typeof value.outputDir === "string" && value.outputDir.trim().length > 0 ? value.outputDir : undefined,
    summaryPath: typeof value.summaryPath === "string" && value.summaryPath.trim().length > 0 ? value.summaryPath : undefined,
    passCount,
    totalCount,
    hardFailureCount,
    medianElapsedMs,
    failureModes: normalizeFailureModes(value.failureModes)
  };
}

function deriveBenchmarkStatus(metrics) {
  if (metrics.totalCount > 0 && metrics.passCount === metrics.totalCount && metrics.hardFailureCount === 0) {
    return "approved";
  }
  if (metrics.hardFailureCount > 0) {
    return "blocked";
  }
  return "experimental";
}

export function normalizeModelBenchmarkManifest(raw) {
  const sourceEntries = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.entries)
      ? raw.entries
      : [];
  const entries = [];
  const seen = new Set();

  for (const rawEntry of sourceEntries) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const provider = typeof rawEntry.provider === "string" && rawEntry.provider.trim().length > 0 ? rawEntry.provider.trim() : "";
    const modelId = normalizeCatalogModelId(provider, typeof rawEntry.modelId === "string" ? rawEntry.modelId : typeof rawEntry.model_id === "string" ? rawEntry.model_id : "");
    if (!provider || !modelId) {
      continue;
    }

    const key = benchmarkModelKey(provider, modelId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const benchmark = normalizeBenchmarkMetrics(rawEntry.benchmark ?? rawEntry.summary);
    const updatedAt = typeof rawEntry.updatedAt === "string" && rawEntry.updatedAt.trim().length > 0
      ? rawEntry.updatedAt
      : benchmark.generatedAt;

    entries.push({
      provider,
      modelId,
      status: normalizeBenchmarkStatus(rawEntry.status ?? rawEntry.policy_status ?? deriveBenchmarkStatus(benchmark)),
      updatedAt,
      benchmark
    });
  }

  return {
    version: 1,
    entries: entries.sort((left, right) => benchmarkModelKey(left.provider, left.modelId).localeCompare(benchmarkModelKey(right.provider, right.modelId)))
  };
}

export function getModelBenchmarkEntry(rawManifest, provider, modelId) {
  const manifest = normalizeModelBenchmarkManifest(rawManifest);
  const canonicalModelId = normalizeCatalogModelId(provider, modelId);
  return manifest.entries.find((entry) => entry.provider === provider && entry.modelId === canonicalModelId) ?? null;
}

export function recordModelBenchmarkResult(rawManifest, result) {
  const manifest = normalizeModelBenchmarkManifest(rawManifest);
  const provider = typeof result?.provider === "string" && result.provider.trim().length > 0 ? result.provider.trim() : "";
  const modelId = normalizeCatalogModelId(provider, typeof result?.modelId === "string" ? result.modelId : typeof result?.model_id === "string" ? result.model_id : "");
  if (!provider || !modelId) {
    return manifest;
  }

  const benchmark = normalizeBenchmarkMetrics({
    benchmarkKind: result?.benchmarkKind ?? result?.benchmark_kind,
    generatedAt: result?.generatedAt ?? result?.generated_at,
    outputDir: result?.outputDir ?? result?.output_dir,
    summaryPath: result?.summaryPath ?? result?.summary_path,
    passCount: result?.passCount ?? result?.summary?.pass_count,
    totalCount: result?.totalCount ?? result?.summary?.total_count,
    hardFailureCount: result?.hardFailureCount ?? result?.summary?.hard_failure_count,
    medianElapsedMs: result?.medianElapsedMs ?? result?.summary?.median_elapsed_ms,
    failureModes: result?.failureModes ?? result?.summary?.failure_modes
  });
  const status = normalizeBenchmarkStatus(result?.status ?? result?.policy_status ?? deriveBenchmarkStatus(benchmark));
  const nextEntries = manifest.entries.filter((entry) => !(entry.provider === provider && entry.modelId === modelId));
  nextEntries.push({
    provider,
    modelId,
    status,
    updatedAt: benchmark.generatedAt,
    benchmark
  });

  return normalizeModelBenchmarkManifest({
    version: 1,
    entries: nextEntries
  });
}

function getApprovedBrowserControlRankMap(existingCatalog, rawManifest) {
  const manifest = normalizeModelBenchmarkManifest(rawManifest);
  const catalog = normalizeModelCatalog(existingCatalog);
  const catalogMap = new Map(catalog.map((entry) => [modelKey(entry.provider, entry.id), entry]));
  const approvedEntries = manifest.entries
    .filter((entry) => entry.provider === "google" && entry.status === "approved")
    .filter((entry) => catalogMap.has(modelKey(entry.provider, entry.modelId)))
    .sort((left, right) => {
      const leftPassRate = left.benchmark.totalCount > 0 ? left.benchmark.passCount / left.benchmark.totalCount : 0;
      const rightPassRate = right.benchmark.totalCount > 0 ? right.benchmark.passCount / right.benchmark.totalCount : 0;
      if (rightPassRate !== leftPassRate) {
        return rightPassRate - leftPassRate;
      }
      if (left.benchmark.hardFailureCount !== right.benchmark.hardFailureCount) {
        return left.benchmark.hardFailureCount - right.benchmark.hardFailureCount;
      }
      const leftCatalog = catalogMap.get(modelKey(left.provider, left.modelId));
      const rightCatalog = catalogMap.get(modelKey(right.provider, right.modelId));
      const priceDelta = effectivePriceOf(leftCatalog) - effectivePriceOf(rightCatalog);
      if (Math.abs(priceDelta) > 0.001) {
        return priceDelta;
      }
      if (left.benchmark.medianElapsedMs !== right.benchmark.medianElapsedMs) {
        return left.benchmark.medianElapsedMs - right.benchmark.medianElapsedMs;
      }
      return left.modelId.localeCompare(right.modelId);
    });

  return approvedEntries.reduce((map, entry, index) => {
    map[entry.modelId] = index;
    return map;
  }, Object.create(null));
}

function isBlockedByBenchmark(rawManifest, provider, modelId) {
  const entry = getModelBenchmarkEntry(rawManifest, provider, modelId);
  return entry?.status === "blocked";
}

export function upsertManualModel(existingCatalog, draft) {
  const catalog = normalizeModelCatalog(existingCatalog);
  const provider = typeof draft?.provider === "string" && draft.provider.trim().length > 0 ? draft.provider.trim() : "";
  const id = normalizeCatalogModelId(provider, typeof draft?.id === "string" ? draft.id : "");
  if (!provider || !id) {
    return catalog;
  }
  if (!isCatalogModelAllowed(provider, id)) {
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
  const canonicalId = normalizeCatalogModelId(provider, id);
  return normalizeModelCatalog(existingCatalog).filter((entry) => (
    !(entry.source === "manual" && entry.provider === provider && entry.id === canonicalId)
  ));
}

export function isBrowserControlBenchmarkCandidate(entry) {
  if (!entry || entry.provider !== "google" || entry.enabled === false) {
    return false;
  }

  const modelId = normalizeCatalogModelId(entry.provider, entry.id);
  if (GOOGLE_REMOVED_MODEL_SET.has(modelId)) {
    return false;
  }

  if (modelId === "models/gemini-2.5-flash-image") {
    return false;
  }

  return entry.supportsTools === true && entry.supportsFunctionCalling === true;
}

export function chooseBrowserControlBenchmarkWinner(results, { safeDefaultModelId = "models/gemini-2.5-flash" } = {}) {
  const canonicalSafeDefault = normalizeCatalogModelId("google", safeDefaultModelId) || "models/gemini-2.5-flash";
  const normalized = toArray(results)
    .map((entry) => {
      const modelId = normalizeCatalogModelId("google", entry?.modelId);
      const totalCount = Number.isFinite(entry?.totalCount) ? Math.max(0, Math.round(entry.totalCount)) : 0;
      const passCount = Number.isFinite(entry?.passCount) ? Math.max(0, Math.round(entry.passCount)) : 0;
      const hardFailureCount = Number.isFinite(entry?.hardFailureCount) ? Math.max(0, Math.round(entry.hardFailureCount)) : 0;
      const medianElapsedMs = Number.isFinite(entry?.medianElapsedMs) ? Math.max(0, Math.round(entry.medianElapsedMs)) : Number.MAX_SAFE_INTEGER;
      const costTier = entry?.costTier in COST_RANK ? entry.costTier : createCatalogEntry("google", modelId).costTier;
      const passRate = totalCount > 0 ? passCount / totalCount : 0;
      return {
        modelId,
        totalCount,
        passCount,
        hardFailureCount,
        medianElapsedMs,
        costTier,
        passRate,
        eligible: Boolean(modelId) && totalCount > 0 && hardFailureCount === 0
      };
    })
    .filter((entry) => entry.modelId);

  const disqualifiedModelIds = normalized
    .filter((entry) => !entry.eligible)
    .map((entry) => entry.modelId);

  const eligible = normalized.filter((entry) => entry.eligible);
  if (eligible.length === 0) {
    return {
      recommendedModelId: canonicalSafeDefault,
      keptSafeDefault: true,
      disqualifiedModelIds,
      rankedModels: [],
      reason: "No benchmark candidates completed without hard failures."
    };
  }

  const topPassRate = Math.max(...eligible.map((entry) => entry.passRate));
  const rankedModels = [...eligible].sort((left, right) => {
    if (right.passRate !== left.passRate) {
      return right.passRate - left.passRate;
    }
    if (left.hardFailureCount !== right.hardFailureCount) {
      return left.hardFailureCount - right.hardFailureCount;
    }
    if (COST_RANK[left.costTier] !== COST_RANK[right.costTier]) {
      return COST_RANK[left.costTier] - COST_RANK[right.costTier];
    }
    if (left.medianElapsedMs !== right.medianElapsedMs) {
      return left.medianElapsedMs - right.medianElapsedMs;
    }
    return left.modelId.localeCompare(right.modelId);
  });

  const topReliabilityGroup = rankedModels.filter((entry) => entry.passRate === topPassRate);
  const recommended = topReliabilityGroup[0] ?? rankedModels[0];

  return {
    recommendedModelId: recommended?.modelId ?? canonicalSafeDefault,
    keptSafeDefault: (recommended?.modelId ?? canonicalSafeDefault) === canonicalSafeDefault,
    disqualifiedModelIds,
    rankedModels,
    reason: `Selected the cheapest model among ${topReliabilityGroup.length} top-reliability candidates.`
  };
}

export function buildTaskCapabilityRequest({ prompt = "", activeMode = "ask", hasImageInput = false } = {}) {
  const normalizedPrompt = typeof prompt === "string" ? prompt.toLowerCase() : "";
  const active = typeof activeMode === "string" ? activeMode.toLowerCase() : "ask";
  const browserActionVerb = /\b(click|select|choose|check|uncheck|upload|fill|type|enter|remove|enable|disable|scroll|trigger|accept|dismiss|submit|drag|drop|set|log(?:\s|-)?in|sign(?:\s|-)?in|log(?:\s|-)?out|sign(?:\s|-)?out|authenticate)\b/;
  const browserActionTarget = /\b(page|site|tab|form|checkbox|dropdown|input|field|button|link|prompt|alert|file|account|credentials|username|password)\b/;
  const browserLocality = /\bon this (page|site)\b/;
  const inferredBrowserControl = browserActionVerb.test(normalizedPrompt)
    && (browserLocality.test(normalizedPrompt) || browserActionTarget.test(normalizedPrompt));

  return {
    usesScreenshotInput: hasImageInput || /\bscreenshot\b/.test(normalizedPrompt),
    requiresVision: hasImageInput || /\b(image|screenshot|photo|picture|look at|see this)\b/.test(normalizedPrompt),
    requiresBrowserControl: active === "control" || inferredBrowserControl,
    requiresFunctionCalling: active === "control" || inferredBrowserControl,
    requiresCodeExecution: /\b(code|python|script|calculate|computation|execute)\b/.test(normalizedPrompt),
    requiresSearch: active === "research" || /\b(search|compare|latest|find sources)\b/.test(normalizedPrompt),
    requiresBrowserSearch: active === "research"
  };
}

function browserControlAutoRank(entry) {
  if (!entry || entry.provider !== "google") {
    return Number.MAX_SAFE_INTEGER;
  }

  const canonicalId = normalizeCatalogModelId(entry.provider, entry.id);
  return GOOGLE_BROWSER_CONTROL_AUTO_RANK_MAP[canonicalId] ?? Number.MAX_SAFE_INTEGER;
}

export function chooseAutoModel(existingCatalog, request, rawConfig, rawBenchmarkManifest) {
  const catalog = normalizeModelCatalog(existingCatalog).filter((entry) => entry.enabled !== false);
  const config = normalizeModelConfig(rawConfig);
  const needs = {
    requiresVision: request?.requiresVision === true,
    requiresFunctionCalling: request?.requiresFunctionCalling === true,
    requiresCodeExecution: request?.requiresCodeExecution === true,
    requiresBrowserSearch: request?.requiresBrowserSearch === true,
    requiresBrowserControl: request?.requiresBrowserControl === true
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

  let eligible = catalog.filter((entry) => {
    if (config.selectedProvider !== "auto" && entry.provider !== config.selectedProvider) {
      return false;
    }
    if (needs.requiresBrowserControl && isBlockedByBenchmark(rawBenchmarkManifest, entry.provider, entry.id)) {
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

  const shouldPreferGoogleBrowserControlModel = needs.requiresBrowserControl
    && (config.selectedProvider === "google" || eligible.every((entry) => entry.provider === "google"));
  const approvedBrowserControlRankMap = shouldPreferGoogleBrowserControlModel
    ? getApprovedBrowserControlRankMap(catalog, rawBenchmarkManifest)
    : Object.create(null);
  const approvedBrowserControlModelIds = Object.keys(approvedBrowserControlRankMap);

  if (shouldPreferGoogleBrowserControlModel && approvedBrowserControlModelIds.length > 0) {
    const approvedModelIdSet = new Set(approvedBrowserControlModelIds);
    eligible = eligible.filter((entry) => approvedModelIdSet.has(normalizeCatalogModelId(entry.provider, entry.id)));
  }

  if (eligible.length === 0) {
    return null;
  }

  eligible.sort((left, right) => {
    if (shouldPreferGoogleBrowserControlModel) {
      const leftApprovedRank = approvedBrowserControlRankMap[normalizeCatalogModelId(left.provider, left.id)];
      const rightApprovedRank = approvedBrowserControlRankMap[normalizeCatalogModelId(right.provider, right.id)];
      if (leftApprovedRank !== undefined || rightApprovedRank !== undefined) {
        if (leftApprovedRank === undefined) return 1;
        if (rightApprovedRank === undefined) return -1;
        if (leftApprovedRank !== rightApprovedRank) return leftApprovedRank - rightApprovedRank;
      }
      const browserControlRankDelta = browserControlAutoRank(left) - browserControlAutoRank(right);
      if (browserControlRankDelta !== 0) return browserControlRankDelta;
    }
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
    reason: shouldPreferGoogleBrowserControlModel
      ? approvedBrowserControlModelIds.length > 0
        ? `approved browser-control model selected from ${eligible.length} candidates`
        : `browser-control preferred model selected from ${eligible.length} candidates`
      : `lowest-cost eligible model selected from ${eligible.length} candidates`,
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
