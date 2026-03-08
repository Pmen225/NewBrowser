import type { ProviderListModelsParams, ProviderTranscribeAudioParams, ProviderValidateParams } from "../../../shared/src/transport";
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
const OPENAI_TRANSCRIBE_TIMEOUT_MS = 120_000;

function extractOpenAiErrorDetails(data: unknown): { message?: string; code?: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const error = (data as { error?: unknown }).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return {};
  }

  return {
    message:
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message.trim()
        : undefined,
    code:
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code.trim()
        : undefined
  };
}

function mapOpenAiReasoningEffort(level: string | undefined): "low" | "medium" | "high" {
  if (level === "minimal" || level === "low") {
    return "low";
  }
  if (level === "medium") {
    return "medium";
  }
  return "high";
}

function supportsOpenAiReasoning(model: string | undefined): boolean {
  const normalized = typeof model === "string" ? model.trim().toLowerCase() : "";
  if (!normalized) {
    return false;
  }

  return (
    normalized.startsWith("gpt-5") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  );
}

function resolveOpenAiReasoning(model: string | undefined, level: string | undefined): { effort: "low" | "medium" | "high" } | undefined {
  if (!supportsOpenAiReasoning(model)) {
    return undefined;
  }

  return {
    effort: mapOpenAiReasoningEffort(level)
  };
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

function toOpenAiInputContent(content: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(content)) {
    return content.flatMap((part) => {
      if (!part || typeof part !== "object") {
        return [];
      }

      const record = part as { type?: unknown; text?: unknown; media_type?: unknown; data?: unknown };
      if (record.type === "image" && typeof record.media_type === "string" && typeof record.data === "string") {
        return [
          {
            type: "input_image",
            image_url: `data:${record.media_type};base64,${record.data}`
          }
        ];
      }

      if (typeof record.text === "string" && record.text.length > 0) {
        return [
          {
            type: "input_text",
            text: record.text
          }
        ];
      }

      return [];
    });
  }

  const text = typeof content === "string" ? content : "";
  return [
    {
      type: "input_text",
      text
    }
  ];
}

function toOpenAiInputItem(message: Parameters<NonNullable<ProviderAdapter["runTurn"]>>[0]["messages"][number]): Record<string, unknown> {
  if (message.role === "tool") {
    return {
      type: "function_call_output",
      call_id: message.tool_call_id,
      output: typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "")
    };
  }

  const normalizedRole = message.role === "system" ? "developer" : message.role;
  return {
    type: "message",
    role: normalizedRole,
    content: toOpenAiInputContent(message.content)
  };
}

function toProviderError(status: number, provider: string, data?: unknown): Error {
  const providerError = extractOpenAiErrorDetails(data);
  const providerMessage = providerError.message;
  if (status === 401 || status === 403) {
    return createProviderAdapterError("PROVIDER_AUTH_FAILED", providerMessage || `${provider} API key rejected`, false);
  }

  if (status === 429) {
    if (providerError.code === "insufficient_quota") {
      return createProviderAdapterError("PROVIDER_RATE_LIMITED", `${provider} quota exceeded. Check billing or switch providers.`, true);
    }
    return createProviderAdapterError("PROVIDER_RATE_LIMITED", providerMessage || `${provider} rate limit reached`, true);
  }

  if (status >= 500) {
    return createProviderAdapterError("PROVIDER_UNAVAILABLE", providerMessage || `${provider} service unavailable`, true);
  }

  return createProviderAdapterError(
    "PROVIDER_HTTP_ERROR",
    providerMessage || `${provider} request failed with HTTP ${status}`,
    status >= 500
  );
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
    throw toProviderError(response.status, "OpenAI", response.data);
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
  const reasoning = resolveOpenAiReasoning(input.model, input.thinkingLevel);
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
        input: input.messages.map((message) => toOpenAiInputItem(message)),
        tools: input.tools.map((tool) => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        })),
        ...(reasoning ? { reasoning } : {})
      })
    },
    OPENAI_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "OpenAI", response.data);
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

async function transcribeOpenAiAudio(
  fetchImpl: FetchLike,
  params: ProviderTranscribeAudioParams
) {
  const normalizedBaseUrl = normalizeBaseUrl(params.base_url, OPENAI_DEFAULT_BASE_URL);
  const audioBuffer = Buffer.from(params.audio_b64, "base64");
  const audioBlob = new Blob([audioBuffer], { type: params.mime_type });
  const form = new FormData();
  form.set("file", audioBlob, `atlas-audio.${params.mime_type.includes("wav") ? "wav" : "webm"}`);
  form.set("model", params.model_id);
  if (params.language) {
    form.set("language", params.language);
  }

  const response = await fetchJsonWithTimeout(
    fetchImpl,
    `${normalizedBaseUrl}/audio/transcriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.api_key}`,
        Accept: "application/json"
      },
      body: form
    },
    OPENAI_TRANSCRIBE_TIMEOUT_MS
  );

  if (!response.ok) {
    throw toProviderError(response.status, "OpenAI", response.data);
  }

  const payload = toJsonObject(response.data) ?? {};
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    throw createProviderAdapterError("PROVIDER_EMPTY_TRANSCRIPTION", "OpenAI returned an empty transcription", true);
  }

  return {
    provider: "openai" as const,
    model_id: params.model_id,
    text
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
      const reasoning = resolveOpenAiReasoning(preferences.selected_model, preferences.thinking_level);
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
          ...(reasoning ? { reasoning } : {}),
          tools,
          local_code_execution: preferences.enable_code_execution === true
        }
      };
    },
    async runTurn(input) {
      return runOpenAiTurn(fetchImpl, input);
    },
    async transcribeAudio(params) {
      return transcribeOpenAiAudio(fetchImpl, params);
    }
  };
}
