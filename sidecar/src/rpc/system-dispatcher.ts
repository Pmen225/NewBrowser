import type { JsonObject } from "../../../shared/src/transport";
import {
  parseAgentGetStateParams,
  parseAgentPauseParams,
  parseAgentRunParams,
  parseAgentResumeParams,
  parseAgentStopParams,
  parseGetRuntimeStateParams,
  parseProviderBenchmarkBrowserControlParams,
  parseProviderListModelsParams,
  parseProviderValidateParams,
  type GetRuntimeStateResult
} from "../../../shared/src/transport";
import { createProviderRegistry } from "../llm/provider-registry";
import type { ProviderStateService } from "../llm/provider-state";
import type { AgentOrchestrator } from "../agent/types";
import type { ProviderRegistry } from "../llm/types";
import type { ActionDispatcher } from "./dispatcher";

export interface SystemDispatcherOptions {
  getRuntimeState: () => GetRuntimeStateResult;
  providerRegistry?: ProviderRegistry;
  providerState?: ProviderStateService;
  orchestrator?: AgentOrchestrator;
  benchmarkRunner?: (params: { provider: "openai" | "anthropic" | "google" | "deepseek"; model_id: string }) => Promise<JsonObject>;
}

function isProviderName(value: unknown): value is "openai" | "anthropic" | "google" | "deepseek" {
  return value === "openai" || value === "anthropic" || value === "google" || value === "deepseek";
}

function parseProviderSelector(params: JsonObject): "openai" | "anthropic" | "google" | "deepseek" | undefined {
  const provider = params.provider;
  if (provider === undefined) {
    return undefined;
  }
  if (!isProviderName(provider)) {
    throw createDispatcherError("INVALID_REQUEST", "Invalid provider", false, {
      field: "provider"
    });
  }
  return provider;
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Error & {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  const error = new Error(message) as Error & {
    code: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

export function createSystemDispatcher(options: SystemDispatcherOptions): ActionDispatcher {
  const registry = options.providerRegistry ?? createProviderRegistry();

  return {
    supports(action: string): boolean {
      return (
        action === "GetRuntimeState" ||
        action === "ProviderValidate" ||
        action === "ProviderListModels" ||
        action === "ProviderBenchmarkBrowserControl" ||
        action === "ProviderDefaultsGet" ||
        action === "ProviderDefaultsPut" ||
        action === "ProviderCatalogGet" ||
        action === "ProviderCatalogSync" ||
        action === "AgentRun" ||
        action === "AgentPause" ||
        action === "AgentResume" ||
        action === "AgentStop" ||
        action === "AgentGetState"
      );
    },
    async dispatch(action: string, _tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action === "GetRuntimeState") {
        const parsed = parseGetRuntimeStateParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid GetRuntimeState params", false);
        }

        return options.getRuntimeState() as unknown as JsonObject;
      }

      if (action === "ProviderValidate") {
        const parsed = parseProviderValidateParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid ProviderValidate params", false);
        }

        try {
          const result = await registry.validate(parsed);
          return result as unknown as JsonObject;
        } catch (error) {
          if (error && typeof error === "object") {
            const candidate = error as {
              code?: unknown;
              message?: unknown;
              retryable?: unknown;
              details?: unknown;
            };

            if (typeof candidate.code === "string" && typeof candidate.message === "string") {
              throw createDispatcherError(
                candidate.code,
                candidate.message,
                candidate.retryable === true,
                candidate.details && typeof candidate.details === "object" ? (candidate.details as Record<string, unknown>) : undefined
              );
            }

            if (typeof candidate.message === "string") {
              throw createDispatcherError("PROVIDER_UNAVAILABLE", candidate.message, true);
            }
          }

          throw createDispatcherError("PROVIDER_UNAVAILABLE", "Provider request failed", true);
        }
      }

      if (action === "ProviderListModels") {
        const parsed = parseProviderListModelsParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid ProviderListModels params", false);
        }

        try {
          const result = await registry.listModels(parsed);
          return result as unknown as JsonObject;
        } catch (error) {
          if (error && typeof error === "object") {
            const candidate = error as {
              code?: unknown;
              message?: unknown;
              retryable?: unknown;
              details?: unknown;
            };

            if (typeof candidate.code === "string" && typeof candidate.message === "string") {
              throw createDispatcherError(
                candidate.code,
                candidate.message,
                candidate.retryable === true,
                candidate.details && typeof candidate.details === "object" ? (candidate.details as Record<string, unknown>) : undefined
              );
            }

            if (typeof candidate.message === "string") {
              throw createDispatcherError("PROVIDER_UNAVAILABLE", candidate.message, true);
            }
          }

          throw createDispatcherError("PROVIDER_UNAVAILABLE", "Provider request failed", true);
        }
      }

      if (action === "ProviderBenchmarkBrowserControl") {
        if (!options.benchmarkRunner) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Benchmark runner is not configured", false);
        }

        const parsed = parseProviderBenchmarkBrowserControlParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid ProviderBenchmarkBrowserControl params", false);
        }

        return await options.benchmarkRunner(parsed);
      }

      if (action === "ProviderDefaultsGet") {
        if (!options.providerState) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Provider state is not configured", false);
        }

        const provider = parseProviderSelector(params);
        const result = await options.providerState.getDefaults(provider);
        return (result ?? null) as unknown as JsonObject;
      }

      if (action === "ProviderDefaultsPut") {
        if (!options.providerState) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Provider state is not configured", false);
        }

        const provider = parseProviderSelector(params);
        if (!provider) {
          throw createDispatcherError("INVALID_REQUEST", "ProviderDefaultsPut requires provider", false, {
            field: "provider"
          });
        }

        const result = await options.providerState.setDefaults({
          provider,
          default_mode: params.default_mode === "manual" ? "manual" : "auto",
          selected_model: typeof params.selected_model === "string" ? params.selected_model : undefined,
          thinking_level: typeof params.thinking_level === "string" ? params.thinking_level as "minimal" | "low" | "medium" | "high" : undefined,
          low_safety: params.low_safety === true,
          enable_function_calling: params.enable_function_calling === true,
          enable_code_execution: params.enable_code_execution === true,
          require_browser_search: params.require_browser_search === true,
          prefer_vision: params.prefer_vision === true
        });
        return result as unknown as JsonObject;
      }

      if (action === "ProviderCatalogGet") {
        if (!options.providerState) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Provider state is not configured", false);
        }

        const provider = parseProviderSelector(params);
        const result = await options.providerState.getCatalog(provider);
        return (result ?? null) as unknown as JsonObject;
      }

      if (action === "ProviderCatalogSync") {
        if (!options.providerState) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Provider state is not configured", false);
        }

        const parsed = parseProviderListModelsParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid ProviderCatalogSync params", false);
        }

        const result = await options.providerState.syncCatalog(parsed);
        return result as unknown as JsonObject;
      }

      if (action === "AgentRun") {
        if (!options.orchestrator) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Agent orchestrator is not configured", false);
        }

        const parsed = parseAgentRunParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid AgentRun params", false);
        }

        const result = await options.orchestrator.run(parsed);
        return result as unknown as JsonObject;
      }

      if (action === "AgentStop") {
        if (!options.orchestrator) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Agent orchestrator is not configured", false);
        }

        const parsed = parseAgentStopParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid AgentStop params", false);
        }

        const result = await options.orchestrator.stop(parsed);
        return result as unknown as JsonObject;
      }

      if (action === "AgentPause") {
        if (!options.orchestrator) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Agent orchestrator is not configured", false);
        }

        const parsed = parseAgentPauseParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid AgentPause params", false);
        }

        const result = await options.orchestrator.pause(parsed);
        return result as unknown as JsonObject;
      }

      if (action === "AgentResume") {
        if (!options.orchestrator) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Agent orchestrator is not configured", false);
        }

        const parsed = parseAgentResumeParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid AgentResume params", false);
        }

        const result = await options.orchestrator.resume(parsed);
        return result as unknown as JsonObject;
      }

      if (action === "AgentGetState") {
        if (!options.orchestrator) {
          throw createDispatcherError("NOT_IMPLEMENTED", "Agent orchestrator is not configured", false);
        }

        const parsed = parseAgentGetStateParams(params);
        if (!parsed) {
          throw createDispatcherError("INVALID_REQUEST", "Invalid AgentGetState params", false);
        }

        const result = await options.orchestrator.getState(parsed);
        return result as unknown as JsonObject;
      }

      throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
    }
  };
}
