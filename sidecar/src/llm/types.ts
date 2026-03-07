import type {
  JsonObject,
  LlmProvider,
  ProviderListModelsParams,
  ProviderListModelsResult,
  ProviderValidateParams,
  ProviderValidateResult
} from "../../../shared/src/transport";

export type FetchLike = typeof fetch;

export interface ProviderAdapterError extends Error {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ProviderModelsPayload {
  models: string[];
  default_model?: string;
}

export type ProviderThinkingLevel = "minimal" | "low" | "medium" | "high";

export interface ProviderRuntimePreferences {
  selected_model?: string;
  default_mode?: "auto" | "manual";
  thinking_level?: ProviderThinkingLevel;
  low_safety?: boolean;
  enable_function_calling?: boolean;
  enable_code_execution?: boolean;
  require_browser_search?: boolean;
  prefer_vision?: boolean;
}

export interface ProviderExecutionConfig {
  provider: LlmProvider;
  model?: string;
  input_capabilities: string[];
  request_shape: JsonObject;
}

export interface ProviderToolDefinition {
  name: string;
  description: string;
  parameters: JsonObject;
}

export interface ProviderImagePart {
  type: "image";
  media_type: "image/png" | "image/jpeg" | "image/webp";
  data: string; // base64-encoded
}

export interface ProviderTextPart {
  type: "text";
  text: string;
}

export type ProviderContentPart = ProviderTextPart | ProviderImagePart;

export interface ProviderToolCallRef {
  id: string;
  name: string;
  arguments: JsonObject;
}

export interface ProviderRuntimeMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ProviderContentPart[];
  tool_call_id?: string;
  tool_name?: string;
  /** Assistant-role messages: the tool calls the model requested this turn */
  tool_calls?: ProviderToolCallRef[];
  provider_parts?: JsonObject[];
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: JsonObject;
}

export interface ProviderTurnInput {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: ProviderRuntimeMessage[];
  tools: ProviderToolDefinition[];
  thinkingLevel?: ProviderThinkingLevel;
  functionCallingMode?: "AUTO" | "NONE" | "ANY" | "VALIDATED";
  allowBrowserSearch: boolean;
  allowCodeExecution: boolean;
  preferVision: boolean;
  signal?: AbortSignal;
}

export interface ProviderTurnOutput {
  assistantText?: string;
  toolCalls: ProviderToolCall[];
  provider_parts?: JsonObject[];
  finishReason?: string;
  raw?: JsonObject;
}

export interface ProviderAdapter {
  readonly provider: LlmProvider;
  validate(params: ProviderValidateParams): Promise<Omit<ProviderValidateResult, "provider">>;
  listModels(params: ProviderListModelsParams): Promise<ProviderModelsPayload>;
  buildExecutionConfig?(preferences: ProviderRuntimePreferences): ProviderExecutionConfig;
  runTurn?(input: ProviderTurnInput): Promise<ProviderTurnOutput>;
}

export interface ProviderRegistry {
  validate(params: ProviderValidateParams): Promise<ProviderValidateResult>;
  listModels(params: ProviderListModelsParams): Promise<ProviderListModelsResult>;
  buildExecutionConfig?(provider: LlmProvider, preferences: ProviderRuntimePreferences): ProviderExecutionConfig;
  runTurn?(provider: LlmProvider, input: ProviderTurnInput): Promise<ProviderTurnOutput>;
}

export function createProviderAdapterError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): ProviderAdapterError {
  const error = new Error(message) as ProviderAdapterError;
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

export function normalizeProviderError(error: unknown): ProviderAdapterError {
  if (error && typeof error === "object") {
    const candidate = error as Partial<ProviderAdapterError>;
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return createProviderAdapterError(candidate.code, candidate.message, candidate.retryable === true, candidate.details);
    }

    if (typeof candidate.message === "string") {
      return createProviderAdapterError("PROVIDER_UNAVAILABLE", candidate.message, true);
    }
  }

  return createProviderAdapterError("PROVIDER_UNAVAILABLE", "Provider request failed", true);
}

export function normalizeModelList(rawModels: unknown): string[] {
  if (!Array.isArray(rawModels)) {
    return [];
  }

  const models = new Set<string>();
  for (const item of rawModels) {
    if (typeof item === "string" && item.trim().length > 0) {
      models.add(item.trim());
    }
  }

  return [...models].sort((left, right) => left.localeCompare(right));
}

export function chooseDefaultModel(models: string[], preferred: string[]): string | undefined {
  for (const candidate of preferred) {
    if (models.includes(candidate)) {
      return candidate;
    }
  }

  return models[0];
}

export async function fetchJsonWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const abortFromSignal = () => {
    controller.abort();
  };
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  try {
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", abortFromSignal, { once: true });
      }
    }

    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } finally {
    if (signal) {
      signal.removeEventListener("abort", abortFromSignal);
    }
    clearTimeout(timer);
  }
}

export function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  if (!baseUrl || baseUrl.trim().length === 0) {
    return fallback;
  }

  return baseUrl.trim().replace(/\/+$/, "");
}

export function modelMatches(candidate: string, expected: string): boolean {
  const normalizedCandidate = candidate.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();
  if (normalizedCandidate === normalizedExpected) {
    return true;
  }

  if (normalizedCandidate.endsWith(`/${normalizedExpected}`)) {
    return true;
  }

  return normalizedExpected.endsWith(`/${normalizedCandidate}`);
}

export function toJsonObject(value: unknown): JsonObject | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  return null;
}

export function parseToolArguments(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch {
      return {
        raw: value
      };
    }
  }

  return {};
}
