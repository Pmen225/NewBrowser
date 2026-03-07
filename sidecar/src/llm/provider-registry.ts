import type {
  LlmProvider,
  ProviderListModelsParams,
  ProviderListModelsResult,
  ProviderTranscribeAudioParams,
  ProviderTranscribeAudioResult,
  ProviderValidateParams,
  ProviderValidateResult
} from "../../../shared/src/transport";
import { createAnthropicAdapter } from "./anthropic";
import { createDeepSeekAdapter } from "./deepseek";
import { createGoogleAdapter } from "./google";
import { createOpenAiAdapter } from "./openai";
import {
  createProviderAdapterError,
  normalizeProviderError,
  type FetchLike,
  type ProviderAdapter,
  type ProviderRegistry,
  type ProviderRuntimePreferences
} from "./types";

function resolveAdapter(adapters: Map<LlmProvider, ProviderAdapter>, provider: LlmProvider): ProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw createProviderAdapterError("PROVIDER_UNSUPPORTED", `Unsupported provider: ${provider}`, false, {
      provider
    });
  }

  return adapter;
}

export function createProviderRegistry(fetchImpl: FetchLike = fetch): ProviderRegistry {
  const adapters = new Map<LlmProvider, ProviderAdapter>();
  const configured = [createOpenAiAdapter(fetchImpl), createAnthropicAdapter(fetchImpl), createGoogleAdapter(fetchImpl), createDeepSeekAdapter(fetchImpl)];
  for (const adapter of configured) {
    adapters.set(adapter.provider, adapter);
  }

  return {
    async validate(params: ProviderValidateParams): Promise<ProviderValidateResult> {
      const adapter = resolveAdapter(adapters, params.provider);
      try {
        const result = await adapter.validate(params);
        return {
          provider: params.provider,
          ok: result.ok,
          error_code: result.error_code,
          error_message: result.error_message
        };
      } catch (error) {
        const normalized = normalizeProviderError(error);
        return {
          provider: params.provider,
          ok: false,
          error_code: normalized.code,
          error_message: normalized.message
        };
      }
    },
    async listModels(params: ProviderListModelsParams): Promise<ProviderListModelsResult> {
      const adapter = resolveAdapter(adapters, params.provider);
      try {
        const result = await adapter.listModels(params);
        return {
          provider: params.provider,
          models: result.models,
          default_model: result.default_model
        };
      } catch (error) {
        const normalized = normalizeProviderError(error);
        throw createProviderAdapterError(normalized.code, normalized.message, normalized.retryable, normalized.details);
      }
    },
    async transcribeAudio(params: ProviderTranscribeAudioParams): Promise<ProviderTranscribeAudioResult> {
      const adapter = resolveAdapter(adapters, params.provider);
      if (typeof adapter.transcribeAudio !== "function") {
        throw createProviderAdapterError("PROVIDER_UNSUPPORTED", `Provider transcription is not available for: ${params.provider}`, false, {
          provider: params.provider
        });
      }

      try {
        return await adapter.transcribeAudio(params);
      } catch (error) {
        const normalized = normalizeProviderError(error);
        throw createProviderAdapterError(normalized.code, normalized.message, normalized.retryable, normalized.details);
      }
    },
    buildExecutionConfig(provider: LlmProvider, preferences: ProviderRuntimePreferences) {
      const adapter = resolveAdapter(adapters, provider);
      if (typeof adapter.buildExecutionConfig === "function") {
        return adapter.buildExecutionConfig(preferences);
      }
      return {
        provider,
        model: preferences.selected_model,
        input_capabilities: preferences.prefer_vision ? ["text", "vision"] : ["text"],
        request_shape: {}
      };
    },
    async runTurn(provider: LlmProvider, input) {
      const adapter = resolveAdapter(adapters, provider);
      if (typeof adapter.runTurn !== "function") {
        throw createProviderAdapterError("PROVIDER_UNSUPPORTED", `Provider runtime is not available for: ${provider}`, false, {
          provider
        });
      }

      try {
        return await adapter.runTurn(input);
      } catch (error) {
        const normalized = normalizeProviderError(error);
        throw createProviderAdapterError(normalized.code, normalized.message, normalized.retryable, normalized.details);
      }
    }
  };
}
