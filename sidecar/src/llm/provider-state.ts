import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { LlmProvider } from "../../../shared/src/transport";
import type { ProviderExecutionConfig, ProviderRegistry, ProviderRuntimePreferences, ProviderThinkingLevel } from "./types";

export interface ProviderDefaultsRecord extends ProviderRuntimePreferences {
  provider: LlmProvider;
  updated_at: string;
  execution?: ProviderExecutionConfig;
}

export interface ProviderCatalogEntry {
  provider: LlmProvider;
  id: string;
  source: "provider_sync";
  display_name: string;
  supports_vision: boolean;
  supports_function_calling: boolean;
  supports_code_execution: boolean;
  supports_browser_search: boolean;
  max_thinking_level: ProviderThinkingLevel;
  safety_default: "provider_default" | "low";
  updated_at: string;
}

export interface ProviderCatalogRecord {
  provider: LlmProvider;
  models: ProviderCatalogEntry[];
  default_model?: string;
  sync_status: "idle" | "ok" | "error";
  synced_at?: string;
  error_message?: string;
}

export interface ProviderCatalogSyncInput {
  provider: LlmProvider;
  api_key: string;
  base_url?: string;
}

export interface ProviderStateService {
  getDefaults(provider?: LlmProvider): Promise<ProviderDefaultsRecord | ProviderDefaultsRecord[] | null>;
  setDefaults(input: ProviderDefaultsRecordInput): Promise<ProviderDefaultsRecord>;
  getCatalog(provider?: LlmProvider): Promise<ProviderCatalogRecord | ProviderCatalogRecord[] | null>;
  syncCatalog(input: ProviderCatalogSyncInput): Promise<ProviderCatalogRecord>;
  primeFromEnvironment(): Promise<void>;
}

export interface ProviderDefaultsRecordInput extends ProviderRuntimePreferences {
  provider: LlmProvider;
}

interface PersistedProviderState {
  defaults: ProviderDefaultsRecord[];
  catalogs: ProviderCatalogRecord[];
}

interface ProviderStateServiceOptions {
  providerRegistry: ProviderRegistry;
  cachePath?: string;
  env?: Record<string, string | undefined>;
}

const DEFAULT_STATE: PersistedProviderState = {
  defaults: [],
  catalogs: []
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeThinkingLevel(value: unknown): ProviderThinkingLevel {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "high";
}

function uniqueProviders(defaults: ProviderDefaultsRecord[]): ProviderDefaultsRecord[] {
  const seen = new Set<string>();
  const ordered: ProviderDefaultsRecord[] = [];
  for (const entry of defaults) {
    if (seen.has(entry.provider)) {
      continue;
    }
    seen.add(entry.provider);
    ordered.push(entry);
  }
  return ordered;
}

function normalizeDefaultsRecord(
  input: ProviderDefaultsRecordInput,
  previous: ProviderDefaultsRecord | undefined,
  execution: ProviderExecutionConfig
): ProviderDefaultsRecord {
  return {
    provider: input.provider,
    default_mode: input.default_mode === "manual" ? "manual" : "auto",
    selected_model: typeof input.selected_model === "string" && input.selected_model.trim().length > 0 ? input.selected_model.trim() : undefined,
    thinking_level: normalizeThinkingLevel(input.thinking_level),
    low_safety: input.low_safety === true,
    enable_function_calling: input.enable_function_calling === true,
    enable_code_execution: input.enable_code_execution === true,
    require_browser_search: input.require_browser_search === true,
    prefer_vision: input.prefer_vision === true,
    updated_at: nowIso(),
    execution,
    ...(previous ? { updated_at: nowIso() } : {})
  };
}

function inferVisionSupport(modelId: string): boolean {
  const normalized = modelId.toLowerCase();
  return (
    normalized.includes("vision") ||
    normalized.includes("omni") ||
    normalized.includes("gpt-4o") ||
    normalized.includes("gemini") ||
    normalized.includes("claude-3") ||
    normalized.includes("claude-4")
  );
}

function inferFunctionCallingSupport(modelId: string, provider: LlmProvider): boolean {
  const normalized = modelId.toLowerCase();
  if (provider === "google" || provider === "openai" || provider === "deepseek") {
    return true;
  }
  return normalized.includes("claude-3") || normalized.includes("claude-4");
}

function inferCodeExecutionSupport(modelId: string, provider: LlmProvider): boolean {
  const normalized = modelId.toLowerCase();
  if (provider === "google") {
    return normalized.includes("gemini");
  }
  return normalized.includes("reasoner") || normalized.includes("gpt-5") || normalized.includes("gpt-4.1");
}

function inferBrowserSearchSupport(provider: LlmProvider): boolean {
  return provider === "openai" || provider === "google";
}

function inferThinkingLevel(modelId: string): ProviderThinkingLevel {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("flash") || normalized.includes("mini")) {
    return "medium";
  }
  if (normalized.includes("haiku")) {
    return "low";
  }
  return "high";
}

function createCatalogEntry(provider: LlmProvider, modelId: string): ProviderCatalogEntry {
  const trimmed = modelId.trim();
  return {
    provider,
    id: trimmed,
    source: "provider_sync",
    display_name: trimmed.replace(/^models\//, ""),
    supports_vision: inferVisionSupport(trimmed),
    supports_function_calling: inferFunctionCallingSupport(trimmed, provider),
    supports_code_execution: inferCodeExecutionSupport(trimmed, provider),
    supports_browser_search: inferBrowserSearchSupport(provider),
    max_thinking_level: inferThinkingLevel(trimmed),
    safety_default: provider === "google" ? "low" : "provider_default",
    updated_at: nowIso()
  };
}

function normalizePersistedState(raw: unknown): PersistedProviderState {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_STATE;
  }

  const defaults = Array.isArray((raw as { defaults?: unknown }).defaults)
    ? (raw as { defaults: ProviderDefaultsRecord[] }).defaults
        .filter((entry) => entry && typeof entry === "object" && typeof entry.provider === "string")
        .map((entry) => ({
          ...entry,
          thinking_level: normalizeThinkingLevel(entry.thinking_level)
        }))
    : [];

  const catalogs = Array.isArray((raw as { catalogs?: unknown }).catalogs)
    ? (raw as { catalogs: ProviderCatalogRecord[] }).catalogs
        .filter((entry) => entry && typeof entry === "object" && typeof entry.provider === "string")
        .map((entry) => ({
          ...entry,
          sync_status: (
            entry.sync_status === "error"
              ? "error"
              : entry.sync_status === "ok"
                ? "ok"
                : "idle"
          ) as ProviderCatalogRecord["sync_status"],
          models: Array.isArray(entry.models) ? entry.models : []
        }))
    : [];

  return {
    defaults: uniqueProviders(defaults),
    catalogs
  };
}

function providerEnvEntries(env: Record<string, string | undefined>): ProviderCatalogSyncInput[] {
  const entries: ProviderCatalogSyncInput[] = [];
  const add = (provider: LlmProvider, key: string | undefined, baseUrl: string | undefined) => {
    if (!key || key.trim().length === 0) {
      return;
    }
    entries.push({
      provider,
      api_key: key.trim(),
      ...(baseUrl && baseUrl.trim().length > 0 ? { base_url: baseUrl.trim() } : {})
    });
  };

  add("openai", env.OPENAI_API_KEY, env.OPENAI_BASE_URL);
  add("anthropic", env.ANTHROPIC_API_KEY, env.ANTHROPIC_BASE_URL);
  add("google", env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY, env.GEMINI_BASE_URL ?? env.GOOGLE_BASE_URL);
  add("deepseek", env.DEEPSEEK_API_KEY, env.DEEPSEEK_BASE_URL);
  return entries;
}

export function createProviderStateService(options: ProviderStateServiceOptions): ProviderStateService {
  const env = options.env ?? process.env;
  let state = DEFAULT_STATE;
  let loadPromise: Promise<void> | null = null;

  async function ensureLoaded(): Promise<void> {
    if (loadPromise) {
      await loadPromise;
      return;
    }

    loadPromise = (async () => {
      if (!options.cachePath) {
        return;
      }

      try {
        const raw = await readFile(options.cachePath, "utf8");
        state = normalizePersistedState(JSON.parse(raw));
      } catch {
        state = DEFAULT_STATE;
      }
    })();

    await loadPromise;
  }

  async function persist(): Promise<void> {
    if (!options.cachePath) {
      return;
    }

    await mkdir(dirname(options.cachePath), { recursive: true });
    await writeFile(options.cachePath, JSON.stringify(state, null, 2), "utf8");
  }

  function findDefaults(provider: LlmProvider): ProviderDefaultsRecord | undefined {
    return state.defaults.find((entry) => entry.provider === provider);
  }

  function upsertDefaults(record: ProviderDefaultsRecord): void {
    const next = state.defaults.filter((entry) => entry.provider !== record.provider);
    next.unshift(record);
    state = {
      ...state,
      defaults: uniqueProviders(next)
    };
  }

  function upsertCatalog(record: ProviderCatalogRecord): void {
    state = {
      ...state,
      catalogs: [record, ...state.catalogs.filter((entry) => entry.provider !== record.provider)]
    };
  }

  return {
    async getDefaults(provider) {
      await ensureLoaded();
      if (provider) {
        return findDefaults(provider) ?? null;
      }
      return [...state.defaults];
    },

    async setDefaults(input) {
      await ensureLoaded();
      const current = findDefaults(input.provider);
      const resolvedPreferences = {
        ...current,
        ...input,
        thinking_level: normalizeThinkingLevel(input.thinking_level ?? current?.thinking_level)
      };
      const execution =
        options.providerRegistry.buildExecutionConfig?.(input.provider, resolvedPreferences) ?? {
          provider: input.provider,
          model: resolvedPreferences.selected_model,
          input_capabilities: resolvedPreferences.prefer_vision ? ["text", "vision"] : ["text"],
          request_shape: {}
        };
      const record = normalizeDefaultsRecord(input, current, execution);
      upsertDefaults(record);
      await persist();
      return record;
    },

    async getCatalog(provider) {
      await ensureLoaded();
      if (provider) {
        return state.catalogs.find((entry) => entry.provider === provider) ?? null;
      }
      return [...state.catalogs];
    },

    async syncCatalog(input) {
      await ensureLoaded();
      try {
        const listed = await options.providerRegistry.listModels(input);
        const defaults = findDefaults(input.provider);
        const record: ProviderCatalogRecord = {
          provider: input.provider,
          models: listed.models.map((modelId) => createCatalogEntry(input.provider, modelId)),
          default_model: defaults?.selected_model || listed.default_model,
          sync_status: "ok",
          synced_at: nowIso()
        };
        upsertCatalog(record);
        await persist();
        return record;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const record: ProviderCatalogRecord = {
          provider: input.provider,
          models: state.catalogs.find((entry) => entry.provider === input.provider)?.models ?? [],
          default_model: state.catalogs.find((entry) => entry.provider === input.provider)?.default_model,
          sync_status: "error",
          synced_at: nowIso(),
          error_message: message
        };
        upsertCatalog(record);
        await persist();
        return record;
      }
    },

    async primeFromEnvironment() {
      await ensureLoaded();
      const entries = providerEnvEntries(env);
      await Promise.all(entries.map(async (entry) => {
        await this.syncCatalog(entry);
      }));
    }
  };
}
