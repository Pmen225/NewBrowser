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

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const OPENAI_DEFAULT_TIMEOUT_MS = 10_000;
const OPENAI_RUN_TURN_TIMEOUT_MS = 120_000;

function mapOpenAiReasoningEffort(level: string | undefined): "low" | "medium" | "high" {
  if (level === "minimal" || level === "low") {
    return "low";
  }
  if (level === "medium") {
    return "medium";
  }
  return "high";
}

function extractOpenAiModels(payload: unknown): string[] {
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

async function listOpenAiModels(
  fetchImpl: FetchLike,
  apiKey: string,
  baseUrl: string | undefined,
  timeoutMs: number
): Promise<ProviderModelsPayload> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, OPENAI_DEFAULT_BASE_URL);
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
    throw toProviderError(response.status, "OpenAI");
  }

  const models = extractOpenAiModels(response.data);
  if (models.length === 0) {
    throw createProviderAdapterError("PROVIDER_EMPTY_MODELS", "OpenAI returned an empty model list", true);
  }

  return {
    models,
    default_model: chooseDefaultModel(models, ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"])
  };
}

async function runOpenAiTurn(
  fetchImpl: FetchLike,
  input: Parameters<NonNullable<ProviderAdapter["runTurn"]>>[0]
) {
  const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl, OPENAI_DEFAULT_BASE_URL);
  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/responses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        input: input.messages.map((message) => ({
          role: message.role,
          content: Array.isArray(message.content)
            ? message.content.map((part: any) =>
                part.type === "image"
                  ? { type: "image_url", image_url: { url: `data:${part.media_type};base64,${part.data}` } }
                  : { type: "text", text: part.text }
              )
            : message.content,
          ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
          ...(message.tool_name ? { tool_name: message.tool_name } : {})
        })),
        tools: input.tools.map((tool) => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        })),
        reasoning: {
          effort: mapOpenAiReasoningEffort(input.thinkingLevel)
        }
      })
    },
    OPENAI_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "OpenAI");
  }

  const raw = toJsonObject(response.data) ?? {};
  const output = Array.isArray(raw.output) ? raw.output : [];
  const toolCalls = output
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .flatMap((item, index) => {
      const record = item as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : "";
      if (type !== "function_call" && type !== "tool_call") {
        return [];
      }

      const name =
        typeof record.name === "string"
          ? record.name
          : record.function && typeof record.function === "object" && typeof (record.function as { name?: unknown }).name === "string"
            ? (record.function as { name: string }).name
            : undefined;
      if (!name) {
        return [];
      }

      return [
        {
          id: typeof record.call_id === "string" ? record.call_id : typeof record.id === "string" ? record.id : `openai-tool-${index + 1}`,
          name,
          arguments: parseToolArguments(
            record.arguments ??
              (record.function && typeof record.function === "object" ? (record.function as { arguments?: unknown }).arguments : undefined)
          )
        }
      ];
    });

  return {
    assistantText: typeof raw.output_text === "string" ? raw.output_text : undefined,
    toolCalls,
    raw
  };
}

export function createOpenAiAdapter(fetchImpl: FetchLike = fetch): ProviderAdapter {
  return {
    provider: "openai",
    async validate(params: ProviderValidateParams) {
      try {
        const payload = await listOpenAiModels(
          fetchImpl,
          params.api_key,
          params.base_url,
          params.timeout_ms ?? OPENAI_DEFAULT_TIMEOUT_MS
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
      return listOpenAiModels(fetchImpl, params.api_key, params.base_url, OPENAI_DEFAULT_TIMEOUT_MS);
    },
    buildExecutionConfig(preferences) {
      const tools = [];
      if (preferences.require_browser_search) {
        tools.push({ type: "web_search_preview" });
      }
      if (preferences.enable_function_calling) {
        tools.push({ type: "function" });
      }

      return {
        provider: "openai",
        model: preferences.selected_model,
        input_capabilities: preferences.prefer_vision ? ["text", "vision"] : ["text"],
        request_shape: {
          endpoint: "responses.create",
          model: preferences.selected_model,
          reasoning: {
            effort: mapOpenAiReasoningEffort(preferences.thinking_level)
          },
          tools,
          local_code_execution: preferences.enable_code_execution === true
        }
      };
    },
    async runTurn(input) {
      return runOpenAiTurn(fetchImpl, input);
    }
  };
}
