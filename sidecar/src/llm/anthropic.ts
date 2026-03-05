import type { ProviderListModelsParams, ProviderValidateParams } from "../../../shared/src/transport";
import {
  chooseDefaultModel,
  createProviderAdapterError,
  fetchJsonWithTimeout,
  modelMatches,
  normalizeBaseUrl,
  normalizeModelList,
  normalizeProviderError,
  toJsonObject,
  type FetchLike,
  type ProviderAdapter,
  type ProviderModelsPayload,
  type ProviderContentPart
} from "./types";

function mapPartsForAnthropic(content: string | ProviderContentPart[]): unknown {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    if (part.type === "image") {
      return {
        type: "image",
        source: { type: "base64", media_type: part.media_type, data: part.data }
      };
    }
    return part;
  });
}

const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_DEFAULT_TIMEOUT_MS = 10_000;
const ANTHROPIC_RUN_TURN_TIMEOUT_MS = 120_000;
const ANTHROPIC_VERSION = "2023-06-01";

function resolveAnthropicThinking(level: string | undefined): "minimal" | "low" | "medium" | "high" {
  if (level === "minimal" || level === "low" || level === "medium") {
    return level;
  }
  return "high";
}

function extractAnthropicModels(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }

  return normalizeModelList(
    data
      .map((item) => (item && typeof item === "object" ? (item as { id?: unknown; name?: unknown }).id ?? (item as { name?: unknown }).name : undefined))
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

async function listAnthropicModels(
  fetchImpl: FetchLike,
  apiKey: string,
  baseUrl: string | undefined,
  timeoutMs: number
): Promise<ProviderModelsPayload> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, ANTHROPIC_DEFAULT_BASE_URL);
  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/models`,
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        Accept: "application/json"
      }
    },
    timeoutMs
  );

  if (!response.ok) {
    throw toProviderError(response.status, "Anthropic");
  }

  const models = extractAnthropicModels(response.data);
  if (models.length === 0) {
    throw createProviderAdapterError("PROVIDER_EMPTY_MODELS", "Anthropic returned an empty model list", true);
  }

  return {
    models,
    default_model: chooseDefaultModel(models, ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"])
  };
}

async function runAnthropicTurn(
  fetchImpl: FetchLike,
  input: Parameters<NonNullable<ProviderAdapter["runTurn"]>>[0]
) {
  const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl, ANTHROPIC_DEFAULT_BASE_URL);
  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/messages`,
    {
      method: "POST",
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        Accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1024,
        system: input.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n"),
        messages: input.messages
          .filter((message) => message.role !== "system")
          .map((message) => ({
            role: message.role === "tool" ? "user" : message.role,
            content:
              message.role === "tool"
                ? [
                    {
                      type: "tool_result",
                      tool_use_id: message.tool_call_id,
                      content: Array.isArray(message.content)
                        ? message.content.map((part: any) =>
                            part.type === "image"
                              ? { type: "image", source: { type: "base64", media_type: part.media_type, data: part.data } }
                              : { type: "text", text: part.text }
                          )
                        : message.content
                    }
                  ]
                : mapPartsForAnthropic(message.content as string | ProviderContentPart[])
          })),
        tools: input.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters
        }))
      })
    },
    ANTHROPIC_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "Anthropic");
  }

  const raw = toJsonObject(response.data) ?? {};
  const content = Array.isArray(raw.content) ? raw.content : [];
  const assistantText = content
    .filter((item) => item && typeof item === "object" && !Array.isArray(item) && (item as { type?: unknown }).type === "text")
    .map((item) => ((item as { text?: unknown }).text && typeof (item as { text?: unknown }).text === "string" ? (item as { text: string }).text : ""))
    .filter((text) => text.length > 0)
    .join("\n")
    .trim();
  const toolCalls = content
    .filter((item) => item && typeof item === "object" && !Array.isArray(item) && (item as { type?: unknown }).type === "tool_use")
    .flatMap((item) => {
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.name !== "string") {
        return [];
      }

      return [
        {
          id: record.id,
          name: record.name,
          arguments: record.input && typeof record.input === "object" && !Array.isArray(record.input) ? (record.input as Record<string, unknown>) : {}
        }
      ];
    });

  return {
    assistantText: assistantText || undefined,
    toolCalls,
    raw
  };
}

export function createAnthropicAdapter(fetchImpl: FetchLike = fetch): ProviderAdapter {
  return {
    provider: "anthropic",
    async validate(params: ProviderValidateParams) {
      try {
        const payload = await listAnthropicModels(
          fetchImpl,
          params.api_key,
          params.base_url,
          params.timeout_ms ?? ANTHROPIC_DEFAULT_TIMEOUT_MS
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
      return listAnthropicModels(fetchImpl, params.api_key, params.base_url, ANTHROPIC_DEFAULT_TIMEOUT_MS);
    },
    buildExecutionConfig(preferences) {
      const tools = [];
      if (preferences.enable_function_calling) {
        tools.push({ type: "tool_use" });
      }
      if (preferences.require_browser_search) {
        tools.push({ type: "search_web" });
      }

      return {
        provider: "anthropic",
        model: preferences.selected_model,
        input_capabilities: preferences.prefer_vision ? ["text", "vision"] : ["text"],
        request_shape: {
          endpoint: "messages.create",
          model: preferences.selected_model,
          thinking: {
            level: resolveAnthropicThinking(preferences.thinking_level)
          },
          tools,
          local_code_execution: preferences.enable_code_execution === true
        }
      };
    },
    async runTurn(input) {
      return runAnthropicTurn(fetchImpl, input);
    }
  };
}
