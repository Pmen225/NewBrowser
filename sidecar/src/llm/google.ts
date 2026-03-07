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
  type ProviderContentPart,
  type ProviderModelsPayload
} from "./types";

const GOOGLE_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_DEFAULT_TIMEOUT_MS = 10_000;
const GOOGLE_RUN_TURN_TIMEOUT_MS = 120_000;
const GOOGLE_FALLBACK_MODEL = "models/gemini-2.5-flash";
const GOOGLE_CURATED_MODELS = [
  "models/gemini-flash-latest",
  "models/gemini-flash-lite-latest",
  "models/gemini-2.5-flash",
  "models/gemini-2.5-flash-lite",
  "models/gemini-3-flash-preview",
  "models/gemini-3.1-flash-lite-preview",
  "models/gemini-2.5-pro",
  "models/gemini-3-pro-preview",
  "models/gemini-3.1-pro-preview",
  "models/gemini-2.5-flash-image"
] as const;

type GoogleFunctionSchema = {
  type?: string;
  description?: string;
  format?: string;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, GoogleFunctionSchema>;
  items?: GoogleFunctionSchema;
  required?: string[];
  anyOf?: GoogleFunctionSchema[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

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

function resolveGoogleThinkingBudget(level: string | undefined): number {
  if (level === "minimal") {
    return 128;
  }
  if (level === "low") {
    return 512;
  }
  if (level === "medium") {
    return 1024;
  }
  return 2048;
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

function normalizeGoogleToolResponse(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { result: parsed };
  } catch {
    return { result: content };
  }
}

function mapGoogleInlineParts(parts: ProviderContentPart[]): Array<Record<string, unknown>> {
  return parts.flatMap((part) => {
    if (part.type === "text") {
      const text = part.text.trim();
      return text ? [{ text }] : [];
    }
    return [{ inlineData: { mimeType: part.media_type, data: part.data } }];
  });
}

function sanitizeGoogleFunctionSchema(schema: unknown): GoogleFunctionSchema {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object" };
  }

  const source = schema as Record<string, unknown>;
  const sanitized: GoogleFunctionSchema = {};

  if (typeof source.type === "string" && source.type.trim()) {
    sanitized.type = source.type;
  }
  if (typeof source.description === "string" && source.description.trim()) {
    sanitized.description = source.description;
  }
  if (typeof source.format === "string" && source.format.trim()) {
    sanitized.format = source.format;
  }
  if (typeof source.nullable === "boolean") {
    sanitized.nullable = source.nullable;
  }
  if (Array.isArray(source.enum) && source.enum.length > 0) {
    sanitized.enum = source.enum;
  }
  if (typeof source.minimum === "number") {
    sanitized.minimum = source.minimum;
  }
  if (typeof source.maximum === "number") {
    sanitized.maximum = source.maximum;
  }
  if (typeof source.minItems === "number") {
    sanitized.minItems = source.minItems;
  }
  if (typeof source.maxItems === "number") {
    sanitized.maxItems = source.maxItems;
  }
  if (typeof source.minLength === "number") {
    sanitized.minLength = source.minLength;
  }
  if (typeof source.maxLength === "number") {
    sanitized.maxLength = source.maxLength;
  }
  if (typeof source.pattern === "string" && source.pattern) {
    sanitized.pattern = source.pattern;
  }

  const unionSource = Array.isArray(source.anyOf) ? source.anyOf : Array.isArray(source.oneOf) ? source.oneOf : null;
  if (unionSource) {
    const sanitizedUnion = unionSource
      .map((entry) => sanitizeGoogleFunctionSchema(entry))
      .filter((entry) => Object.keys(entry).length > 0);
    if (sanitizedUnion.length > 0) {
      sanitized.anyOf = sanitizedUnion;
    }
  }

  if (source.properties && typeof source.properties === "object" && !Array.isArray(source.properties)) {
    const sanitizedProperties = Object.entries(source.properties).reduce<Record<string, GoogleFunctionSchema>>((acc, [key, value]) => {
      const nested = sanitizeGoogleFunctionSchema(value);
      if (Object.keys(nested).length > 0) {
        acc[key] = nested;
      }
      return acc;
    }, {});
    if (Object.keys(sanitizedProperties).length > 0) {
      sanitized.properties = sanitizedProperties;
    }
  }

  if (source.items !== undefined) {
    const sanitizedItems = sanitizeGoogleFunctionSchema(source.items);
    if (Object.keys(sanitizedItems).length > 0) {
      sanitized.items = sanitizedItems;
    }
  }

  if (Array.isArray(source.required)) {
    const required = source.required.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    if (required.length > 0) {
      sanitized.required = sanitized.properties ? required.filter((entry) => entry in sanitized.properties!) : required;
    }
  }

  if (!sanitized.type) {
    if (sanitized.properties) {
      sanitized.type = "object";
    } else if (sanitized.items) {
      sanitized.type = "array";
    }
  }

  return sanitized;
}

function serializeGoogleToolMessage(
  toolName: string,
  content: string | ProviderContentPart[]
): Array<{ role: "user"; parts: Array<Record<string, unknown>> }> {
  if (typeof content === "string") {
    return [{ role: "user", parts: [{ functionResponse: { name: toolName, response: normalizeGoogleToolResponse(content) } }] }];
  }

  const textParts = content.filter((part): part is Extract<ProviderContentPart, { type: "text" }> => part.type === "text");
  const imageParts = content.filter((part): part is Extract<ProviderContentPart, { type: "image" }> => part.type === "image");
  const responseSource = textParts.map((part) => part.text).join("\n\n").trim();
  const response = responseSource
    ? normalizeGoogleToolResponse(responseSource)
    : { ok: true, image_count: imageParts.length };

  const messages: Array<{ role: "user"; parts: Array<Record<string, unknown>> }> = [
    { role: "user", parts: [{ functionResponse: { name: toolName, response } }] }
  ];

  if (imageParts.length > 0) {
    messages.push({
      role: "user",
      parts: [
        { text: "Tool visual artifact attached for inspection." },
        ...mapGoogleInlineParts(imageParts)
      ]
    });
  }

  return messages;
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
  const mergedModels = normalizeModelList(models.concat(GOOGLE_CURATED_MODELS));
  if (mergedModels.length === 0) {
    throw createProviderAdapterError("PROVIDER_EMPTY_MODELS", "Google returned an empty model list", true);
  }

  return {
    models: mergedModels,
    default_model: chooseDefaultModel(mergedModels, [
      "models/gemini-2.5-flash",
      "models/gemini-2.5-pro",
      "models/gemini-flash-latest",
      "models/gemini-2.5-flash-lite",
      "models/gemini-flash-lite-latest",
      "models/gemini-3-flash-preview",
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
        // Gemini requires system prompt in systemInstruction, not in contents
        ...(input.messages.some(m => m.role === "system") ? {
          systemInstruction: {
            parts: [{ text: input.messages.find(m => m.role === "system")?.content ?? "" }]
          }
        } : {}),
        contents: input.messages.flatMap((message) => {
          // System handled via systemInstruction above
          if (message.role === "system") return [];

          // Tool result → user turn with functionResponse (proper Gemini format)
          if (message.role === "tool") {
            const toolName = message.tool_name ?? "unknown_tool";
            return serializeGoogleToolMessage(toolName, message.content);
          }

          // Assistant turn → model turn with optional text + functionCall parts
          if (message.role === "assistant") {
            if (Array.isArray(message.provider_parts) && message.provider_parts.length > 0) {
              return [{ role: "model", parts: message.provider_parts }];
            }
            const parts: Array<Record<string, unknown>> = [];
            const text = typeof message.content === "string" ? message.content.trim() : "";
            if (text) parts.push({ text });
            for (const tc of (message as { tool_calls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> }).tool_calls ?? []) {
              parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
            }
            if (parts.length === 0) return [];
            return [{ role: "model", parts }];
          }

          // User message: text + optional inline images
          if (Array.isArray(message.content)) {
            const parts: Array<Record<string, unknown>> = [];
            for (const part of message.content) {
              if (part.type === "text" && part.text.trim()) {
                parts.push({ text: part.text });
              } else if (part.type === "image") {
                parts.push({ inlineData: { mimeType: part.media_type, data: part.data } });
              }
            }
            return parts.length ? [{ role: "user", parts }] : [];
          }
          const text = typeof message.content === "string" ? message.content : "";
          return text.trim() ? [{ role: "user", parts: [{ text }] }] : [];
        }),
        tools: input.tools.length > 0
          ? [
              {
                functionDeclarations: input.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: sanitizeGoogleFunctionSchema(tool.parameters)
                }))
              }
            ]
          : [],
        ...(input.tools.length > 0
          ? {
              toolConfig: {
                functionCallingConfig: {
                  mode: input.functionCallingMode ?? "VALIDATED"
                }
              }
            }
          : {
              toolConfig: {
                functionCallingConfig: {
                  mode: "NONE"
                }
              }
            }),
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: resolveGoogleThinkingBudget(input.thinkingLevel)
          }
        }
      })
    },
    GOOGLE_RUN_TURN_TIMEOUT_MS,
    input.signal
  );

  if (!response.ok) {
    throw toProviderError(response.status, "Google");
  }

  const raw = toJsonObject(response.data) ?? {};
  const finishReason =
    typeof (raw.candidates as Array<{ finishReason?: unknown }> | undefined)?.[0]?.finishReason === "string"
      ? ((raw.candidates as Array<{ finishReason: string }>)[0]?.finishReason ?? undefined)
      : undefined;
  const parts =
    Array.isArray((raw.candidates as { content?: { parts?: unknown[] } }[] | undefined)?.[0]?.content?.parts)
      ? (((raw.candidates as { content?: { parts?: unknown[] } }[])[0]?.content?.parts as unknown[]) ?? [])
      : [];
  const preservedParts = parts.filter((part): part is Record<string, unknown> => Boolean(toJsonObject(part)));
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
    provider_parts: preservedParts.length > 0 ? preservedParts : undefined,
    finishReason,
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
