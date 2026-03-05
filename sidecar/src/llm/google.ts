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
  type ProviderModelsPayload
} from "./types";

const GOOGLE_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_DEFAULT_TIMEOUT_MS = 10_000;
const GOOGLE_RUN_TURN_TIMEOUT_MS = 120_000;
const GOOGLE_FALLBACK_MODEL = "models/gemini-2.5-flash";

function resolveGoogleThinkingLevel(level: string | undefined): "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" {
  if (level === "minimal") {
    return "MINIMAL";
  }
  if (level === "low") {
    return "LOW";
  }
  if (level === "medium") {
    return "MEDIUM";
  }
  return "HIGH";
}

function extractGoogleModels(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as { models?: unknown }).models;
  if (!Array.isArray(data)) {
    return [];
  }

  return normalizeModelList(
    data
      .map((item) => (item && typeof item === "object" ? (item as { name?: unknown }).name : undefined))
      .filter((value): value is string => typeof value === "string")
  );
}

function normalizeGoogleModelId(model: string | undefined): string {
  const trimmed = typeof model === "string" ? model.trim() : "";
  if (!trimmed) {
    return GOOGLE_FALLBACK_MODEL;
  }

  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith("models/") || normalized.startsWith("tunedmodels/")) {
    return trimmed;
  }

  return `models/${trimmed}`;
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

async function listGoogleModels(
  fetchImpl: FetchLike,
  apiKey: string,
  baseUrl: string | undefined,
  timeoutMs: number
): Promise<ProviderModelsPayload> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl, GOOGLE_DEFAULT_BASE_URL);
  const url = new URL(`${normalizedBaseUrl}/models`);
  url.searchParams.set("key", apiKey);

  const response = await fetchJsonWithTimeout(
    fetchImpl,
    url.toString(),
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    },
    timeoutMs
  );

  if (!response.ok) {
    throw toProviderError(response.status, "Google");
  }

  const models = extractGoogleModels(response.data);
  if (models.length === 0) {
    throw createProviderAdapterError("PROVIDER_EMPTY_MODELS", "Google returned an empty model list", true);
  }

  return {
    models,
    default_model: chooseDefaultModel(models, [
      "models/gemini-2.5-pro",
      "models/gemini-2.5-flash",
      "models/gemini-2.0-flash",
      "models/gemini-1.5-pro",
      "models/gemini-1.5-flash"
    ])
  };
}

async function runGoogleTurn(
  fetchImpl: FetchLike,
  input: Parameters<NonNullable<ProviderAdapter["runTurn"]>>[0]
) {
  const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl, GOOGLE_DEFAULT_BASE_URL);
  const modelId = normalizeGoogleModelId(input.model);
  const url = new URL(`${normalizedBaseUrl}/${modelId}:generateContent`);
  url.searchParams.set("key", input.apiKey);

  const response = await fetchJsonWithTimeout(
    fetchImpl,
    url.toString(),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: input.messages.map((message) => {
          const role = message.role === "assistant" ? "model" : "user";
          // Handle multi-part content (text + images)
          if (Array.isArray(message.content)) {
            const parts: Array<Record<string, unknown>> = [];
            for (const part of message.content) {
              if (part.type === "text") {
                const prefix = message.role === "tool" && message.tool_name
                  ? `Tool ${message.tool_name} (${message.tool_call_id ?? "no-id"}): `
                  : "";
                parts.push({ text: prefix + part.text });
              } else if (part.type === "image") {
                parts.push({
                  inlineData: {
                    mimeType: part.media_type,
                    data: part.data
                  }
                });
              }
            }
            return { role, parts };
          }
          // Simple string content
          return {
            role,
            parts: [
              {
                text:
                  message.role === "tool" && message.tool_name
                    ? `Tool ${message.tool_name} (${message.tool_call_id ?? "no-id"}): ${message.content}`
                    : message.content
              }
            ]
          };
        }),
        tools: input.tools.length > 0
          ? [
              {
                functionDeclarations: input.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters
                }))
              }
            ]
          : []
      })
    },
    GOOGLE_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "Google");
  }

  const raw = toJsonObject(response.data) ?? {};
  const parts =
    Array.isArray((raw.candidates as { content?: { parts?: unknown[] } }[] | undefined)?.[0]?.content?.parts)
      ? (((raw.candidates as { content?: { parts?: unknown[] } }[])[0]?.content?.parts as unknown[]) ?? [])
      : [];
  const assistantText = parts
    .filter((part) => part && typeof part === "object" && !Array.isArray(part) && typeof (part as { text?: unknown }).text === "string")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
  const toolCalls = parts
    .filter(
      (part) =>
        part &&
        typeof part === "object" &&
        !Array.isArray(part) &&
        (part as { functionCall?: unknown }).functionCall &&
        typeof (part as { functionCall: unknown }).functionCall === "object"
    )
    .flatMap((part, index) => {
      const functionCall = (part as { functionCall: Record<string, unknown> }).functionCall;
      if (typeof functionCall.name !== "string") {
        return [];
      }

      return [
        {
          id: `google-tool-${index + 1}`,
          name: functionCall.name,
          arguments:
            functionCall.args && typeof functionCall.args === "object" && !Array.isArray(functionCall.args)
              ? (functionCall.args as Record<string, unknown>)
              : {}
        }
      ];
    });

  return {
    assistantText: assistantText || undefined,
    toolCalls,
    raw
  };
}

export function createGoogleAdapter(fetchImpl: FetchLike = fetch): ProviderAdapter {
  return {
    provider: "google",
    async validate(params: ProviderValidateParams) {
      try {
        const payload = await listGoogleModels(
          fetchImpl,
          params.api_key,
          params.base_url,
          params.timeout_ms ?? GOOGLE_DEFAULT_TIMEOUT_MS
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
      return listGoogleModels(fetchImpl, params.api_key, params.base_url, GOOGLE_DEFAULT_TIMEOUT_MS);
    },
    buildExecutionConfig(preferences) {
      const tools = [];
      if (preferences.enable_function_calling) {
        tools.push({ functionDeclarations: [] });
      }
      if (preferences.enable_code_execution) {
        tools.push({ codeExecution: {} });
      }
      if (preferences.require_browser_search) {
        tools.push({ googleSearch: {} });
      }

      const safetySettings = preferences.low_safety
        ? ["HARASSMENT:BLOCK_NONE", "HATE_SPEECH:BLOCK_NONE", "SEXUAL:BLOCK_NONE", "DANGEROUS:BLOCK_NONE"]
        : [];

      return {
        provider: "google",
        model: normalizeGoogleModelId(preferences.selected_model),
        input_capabilities: preferences.prefer_vision ? ["text", "vision"] : ["text"],
        request_shape: {
          endpoint: "models.generateContent",
          model: normalizeGoogleModelId(preferences.selected_model),
          config: {
            thinkingConfig: {
              thinkingLevel: resolveGoogleThinkingLevel(preferences.thinking_level)
            },
            safetySettings,
            toolConfig: {
              functionCallingConfig: {
                mode: preferences.enable_function_calling ? "AUTO" : "NONE"
              }
            },
            tools
          }
        }
      };
    },
    async runTurn(input) {
      return runGoogleTurn(fetchImpl, input);
    }
  };
}
