import type { ProviderListModelsParams, ProviderValidateParams } from "../../../shared/src/transport";
import {
  chooseDefaultModel,
  createProviderAdapterError,
  fetchJsonWithTimeout,
  modelMatches,
  normalizeBaseUrl,
  normalizeModelList,
  normalizeProviderError,
  parseToolArguments,
  toJsonObject,
  type FetchLike,
  type ProviderAdapter,
  type ProviderModelsPayload
} from "./types";

const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_DEFAULT_TIMEOUT_MS = 10_000;
const DEEPSEEK_RUN_TURN_TIMEOUT_MS = 120_000;

function resolveDeepSeekReasoning(level: string | undefined): "low" | "medium" | "high" {
  if (level === "minimal" || level === "low") {
    return "low";
  }
  if (level === "medium") {
    return "medium";
  }
  return "high";
}

function extractDeepSeekModels(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }

  return normalizeModelList(
    data
      .map((item) => (item && typeof item === "object" ? (item as { id?: unknown }).id : undefined))
      .filter((value): value is string => typeof value === "string")
  );
}

function toProviderError(status: number, provider: string): Error {
  if (status === 401 || status === 403) {
    return createProviderAdapterError("PROVIDER_AUTH_FAILED", `${provider} API key rejected`, false);
  }

  if (status === 429) {
    return createProviderAdapterError("PROVIDER_RATE_LIMITED", `${provider} rate limit reached`, true);
  }

  if (status >= 500) {
    return createProviderAdapterError("PROVIDER_UNAVAILABLE", `${provider} service unavailable`, true);
  }

  return createProviderAdapterError("PROVIDER_HTTP_ERROR", `${provider} request failed with HTTP ${status}`, status >= 500);
}

async function listDeepSeekModels(
  fetchImpl: FetchLike,
  apiKey: string,
  baseUrl: string | undefined,
  timeoutMs: number
): Promise<ProviderModelsPayload> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, DEEPSEEK_DEFAULT_BASE_URL);
  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/models`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    },
    timeoutMs
  );

  if (!response.ok) {
    throw toProviderError(response.status, "DeepSeek");
  }

  const models = extractDeepSeekModels(response.data);
  if (models.length === 0) {
    throw createProviderAdapterError("PROVIDER_EMPTY_MODELS", "DeepSeek returned an empty model list", true);
  }

  return {
    models,
    default_model: chooseDefaultModel(models, ["deepseek-chat", "deepseek-reasoner"])
  };
}

async function runDeepSeekTurn(
  fetchImpl: FetchLike,
  input: Parameters<NonNullable<ProviderAdapter["runTurn"]>>[0]
) {
  const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl, DEEPSEEK_DEFAULT_BASE_URL);
  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
          ...(message.tool_name ? { name: message.tool_name } : {})
        })),
        tools: input.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        }))
      })
    },
    DEEPSEEK_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "DeepSeek");
  }

  const raw = toJsonObject(response.data) ?? {};
  const message =
    raw.choices &&
    Array.isArray(raw.choices) &&
    raw.choices[0] &&
    typeof raw.choices[0] === "object" &&
    (raw.choices[0] as { message?: unknown }).message &&
    typeof (raw.choices[0] as { message?: unknown }).message === "object"
      ? ((raw.choices[0] as { message: Record<string, unknown> }).message ?? {})
      : {};
  const rawToolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const toolCalls = rawToolCalls
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .flatMap((item, index) => {
      const record = item as Record<string, unknown>;
      const functionBlock =
        record.function && typeof record.function === "object" && !Array.isArray(record.function)
          ? (record.function as Record<string, unknown>)
          : null;
      if (!functionBlock || typeof functionBlock.name !== "string") {
        return [];
      }

      return [
        {
          id: typeof record.id === "string" ? record.id : `deepseek-tool-${index + 1}`,
          name: functionBlock.name,
          arguments: parseToolArguments(functionBlock.arguments)
        }
      ];
    });

  return {
    assistantText: typeof message.content === "string" ? message.content : undefined,
    toolCalls,
    raw
  };
}

export function createDeepSeekAdapter(fetchImpl: FetchLike = fetch): ProviderAdapter {
  return {
    provider: "deepseek",
    async validate(params: ProviderValidateParams) {
      try {
        const payload = await listDeepSeekModels(
          fetchImpl,
          params.api_key,
          params.base_url,
          params.timeout_ms ?? DEEPSEEK_DEFAULT_TIMEOUT_MS
        );

        if (params.model && !payload.models.some((model) => modelMatches(model, params.model as string))) {
          return {
            ok: false,
            error_code: "MODEL_NOT_FOUND",
            error_message: `Model not found: ${params.model}`
          };
        }

        return {
          ok: true
        };
      } catch (error) {
        const normalized = normalizeProviderError(error);
        return {
          ok: false,
          error_code: normalized.code,
          error_message: normalized.message
        };
      }
    },
    async listModels(params: ProviderListModelsParams) {
      return listDeepSeekModels(fetchImpl, params.api_key, params.base_url, DEEPSEEK_DEFAULT_TIMEOUT_MS);
    },
    buildExecutionConfig(preferences) {
      const tools = [];
      if (preferences.enable_function_calling) {
        tools.push({ type: "function" });
      }
      if (preferences.require_browser_search) {
        tools.push({ type: "search_web" });
      }

      return {
        provider: "deepseek",
        model: preferences.selected_model,
        input_capabilities: preferences.prefer_vision ? ["text", "vision"] : ["text"],
        request_shape: {
          endpoint: "chat.completions",
          model: preferences.selected_model,
          reasoning: {
            effort: resolveDeepSeekReasoning(preferences.thinking_level)
          },
          tools,
          local_code_execution: preferences.enable_code_execution === true
        }
      };
    },
    async runTurn(input) {
      return runDeepSeekTurn(fetchImpl, input);
    }
  };
}
