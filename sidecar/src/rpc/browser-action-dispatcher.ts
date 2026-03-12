import type { JsonObject } from "../../../shared/src/transport";
import {
  type BrowserRpcAction,
  type LegacyBrowserRpcAction,
  parseTask4Params,
  isTask4Action,
  normalizeTask4Action,
  type ComputerBatchParams,
  type ExtensionOperationParams,
  type FormInputParams,
  type NavigateParams,
  type TabOperationParams
} from "../../../src/sidecar/tools/browser-action-types";
import {
  executeComputerBatch,
  executeExtensionOperation,
  executeFormInput,
  executeNavigate,
  executeTabOperation,
  type BrowserActionRuntime
} from "../../../src/cdp/browser-actions";
import { getRpcRequestContext } from "../observability/request-context";
import type { TraceLogger } from "../observability/trace-logger";
import { normalizeNavigationUrl } from "./blocked-domains";
import type { ActionDispatcher } from "./dispatcher";
import type { AttemptContext, WaitContext } from "./reliability";

export interface BrowserActionDispatcherOptions {
  runtime: BrowserActionRuntime;
  traceLogger?: TraceLogger;
}

interface NavigationHistoryEntry {
  id: number;
  url: string;
}

interface NavigationHistoryResponse {
  currentIndex: number;
  entries: NavigationHistoryEntry[];
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "Unexpected error";
}

async function traceLog(traceLogger: TraceLogger | undefined, input: Parameters<TraceLogger["log"]>[0]): Promise<void> {
  if (!traceLogger) {
    return;
  }

  try {
    await traceLogger.log(input);
  } catch {
    return;
  }
}

function getObservedRuntime(
  runtime: BrowserActionRuntime,
  traceLogger: TraceLogger | undefined,
  action: BrowserRpcAction,
  tabId: string
): BrowserActionRuntime {
  if (!traceLogger) {
    return runtime;
  }

  return {
    ...runtime,
    async send<T>(method: string, params?: object, sessionId?: string): Promise<T> {
      const requestContext = getRpcRequestContext();
      const callParams: JsonObject = {
        method
      };
      if (sessionId) {
        callParams.session_id = sessionId;
      }
      if (params && isJsonObject(params)) {
        callParams.cdp_params = params;
      }

      await traceLog(traceLogger, {
        request_id: requestContext?.request_id,
        action,
        tab_id: tabId,
        event: "cdp.call",
        params: callParams
      });

      try {
        const result = await runtime.send<T>(method, params, sessionId);
        const traceResult: JsonObject = {
          method
        };
        if (sessionId) {
          traceResult.session_id = sessionId;
        }
        if (isJsonObject(result)) {
          traceResult.cdp_result = result;
        }

        await traceLog(traceLogger, {
          request_id: requestContext?.request_id,
          action,
          tab_id: tabId,
          event: "cdp.result",
          result: traceResult
        });

        return result;
      } catch (error) {
        const traceError: JsonObject = {
          method,
          message: normalizeErrorMessage(error)
        };
        if (sessionId) {
          traceError.session_id = sessionId;
        }

        await traceLog(traceLogger, {
          request_id: requestContext?.request_id,
          action,
          tab_id: tabId,
          event: "cdp.error",
          error: traceError
        });

        throw error;
      }
    }
  };
}

async function persistComputerBatchScreenshot(
  traceLogger: TraceLogger | undefined,
  action: BrowserRpcAction,
  tabId: string,
  screenshotB64: string
): Promise<void> {
  if (!traceLogger) {
    return;
  }

  const requestContext = getRpcRequestContext();

  try {
    await traceLogger.writeArtifact({
      request_id: requestContext?.request_id,
      action,
      tab_id: tabId,
      kind: "screenshot",
      extension: "png",
      data: Buffer.from(screenshotB64, "base64")
    });
  } catch (error) {
    await traceLog(traceLogger, {
      request_id: requestContext?.request_id,
      action,
      tab_id: tabId,
      event: "screenshot.error",
      error: {
        message: normalizeErrorMessage(error)
      }
    });
  }
}

function normalizeUrl(raw: string): string {
  try {
    return new URL(raw).toString();
  } catch {
    return raw;
  }
}

function normalizeInternalNavigationUrl(raw: string): string {
  const normalized = normalizeUrl(raw).trim();
  if (normalized.startsWith("chrome://") || normalized.startsWith("chrome-extension://")) {
    return normalized.replace(/\/+$/, "");
  }
  return normalized;
}

function isInternalNavigationUrl(raw: string | undefined): boolean {
  if (!isNonEmptyString(raw)) {
    return false;
  }

  const normalized = normalizeInternalNavigationUrl(raw);
  return normalized.startsWith("chrome://") || normalized.startsWith("chrome-extension://");
}

function isSameHttpsUpgrade(currentUrl: string, expectedUrl: string): boolean {
  try {
    const current = new URL(currentUrl);
    const expected = new URL(expectedUrl);
    const protocols = new Set([current.protocol, expected.protocol]);
    if (!protocols.has("http:") || !protocols.has("https:")) {
      return false;
    }

    return (
      current.hostname === expected.hostname &&
      current.port === expected.port &&
      current.pathname === expected.pathname &&
      current.search === expected.search &&
      current.hash === expected.hash
    );
  } catch {
    return false;
  }
}

function urlsMatchForNavigation(currentUrl: string, expectedUrl: string): boolean {
  const normalizedCurrent = normalizeInternalNavigationUrl(currentUrl);
  const normalizedExpected = normalizeInternalNavigationUrl(expectedUrl);
  return normalizedCurrent === normalizedExpected || isSameHttpsUpgrade(normalizedCurrent, normalizedExpected);
}

function buildNavigateReliabilityHooks(runtime: BrowserActionRuntime, tabId: string, params: NavigateParams) {
  let previousHistoryIndex: number | null = null;

  const getHistory = async (): Promise<NavigationHistoryResponse | null> => {
    try {
      const route = runtime.route(tabId);
      return await runtime.send<NavigationHistoryResponse>("Page.getNavigationHistory", {}, route.sessionId);
    } catch {
      return null;
    }
  };

  return {
    beforeAttempt: async (_ctx: AttemptContext): Promise<void> => {
      const history = await getHistory();
      previousHistoryIndex = history?.currentIndex ?? null;
    },
    waitFor: async (_ctx: WaitContext) => [
      {
        kind: "navigation" as const,
        expected_url: params.mode === "to" ? params.url : undefined
      }
    ],
    waitForNavigation: async (expectedUrl?: string): Promise<boolean> => {
      const history = await getHistory();
      if (!history) {
        return false;
      }

      const current = history.entries[history.currentIndex];
      if (expectedUrl) {
        if (!current) {
          return false;
        }
        return urlsMatchForNavigation(current.url, expectedUrl);
      }

      if (previousHistoryIndex === null) {
        return current !== undefined;
      }

      return history.currentIndex !== previousHistoryIndex;
    }
  };
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

function ensureTask4Action(action: string): LegacyBrowserRpcAction {
  const normalized = normalizeTask4Action(action);
  if (!normalized || !isTask4Action(action)) {
    throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
  }

  return normalized;
}

function extractRawStepAction(step: JsonObject): string {
  const candidates = [step.action, step.kind, step.type, step.operation];
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim().toLowerCase();
    }
  }

  return "";
}

function inferComputerBatchRecoveryHint(params: JsonObject): string | undefined {
  const rawSteps = Array.isArray(params.steps) && params.steps.length > 0 ? params.steps : [params];

  for (const rawStep of rawSteps) {
    if (!isJsonObject(rawStep)) {
      continue;
    }

    const action = extractRawStepAction(rawStep);
    const hasRef = isNonEmptyString(rawStep.ref) || isNonEmptyString(rawStep.ref_id);
    const hasFormValue =
      rawStep.value !== undefined ||
      rawStep.text !== undefined ||
      rawStep.option !== undefined ||
      rawStep.selected_option !== undefined ||
      rawStep.checked !== undefined ||
      rawStep.file !== undefined ||
      rawStep.files !== undefined;

    if ((action.includes("select") || action.includes("option") || action.includes("choose")) && (hasRef || hasFormValue)) {
      return "Invalid params for action ComputerBatch. Use FormInput with ref, kind \"select\", and value for dropdowns and other form controls.";
    }

    if ((action.includes("checkbox") || action.includes("toggle") || action.includes("check")) && (hasRef || hasFormValue)) {
      return "Invalid params for action ComputerBatch. Use FormInput with ref, kind \"checkbox\", and a boolean value for checkbox state changes.";
    }

    if ((action.includes("upload") || action.includes("file")) && (hasRef || hasFormValue)) {
      return "Invalid params for action ComputerBatch. Use FormInput with ref, kind \"file\", and an absolute file path for uploads.";
    }

    if ((action.includes("type") || action.includes("input") || action.includes("fill") || action.includes("enter")) && hasFormValue) {
      return "Invalid params for action ComputerBatch. Use FormInput with ref, kind \"text\", and value when setting form fields.";
    }
  }

  return undefined;
}

function ensureComputerBatchParams(params: JsonObject): ComputerBatchParams {
  const parsed = parseTask4Params("ComputerBatch", params);
  if (!parsed) {
    const recoveryHint = inferComputerBatchRecoveryHint(params);
    throw createDispatcherError("INVALID_REQUEST", recoveryHint ?? "Invalid params for action ComputerBatch", false, {
      action: "ComputerBatch",
      ...(recoveryHint ? { suggested_action: "FormInput" } : {})
    });
  }
  return parsed;
}

function batchEndsOnClick(params: ComputerBatchParams): boolean {
  if (!Array.isArray(params.steps) || params.steps.length === 0) {
    return false;
  }

  return params.steps[params.steps.length - 1]?.kind === "click";
}

function ensureNavigateParams(params: JsonObject): NavigateParams {
  const parsed = parseTask4Params("Navigate", params);
  if (!parsed) {
    throw createDispatcherError("INVALID_REQUEST", "Invalid params for action Navigate", false, {
      action: "Navigate"
    });
  }
  return parsed;
}

function normalizeNavigateParams(params: NavigateParams): NavigateParams {
  if (params.mode !== "to" || typeof params.url !== "string") {
    return params;
  }

  return {
    ...params,
    url: normalizeNavigationUrl(params.url)
  };
}

function ensureFormInputParams(params: JsonObject): FormInputParams {
  const parsed = parseTask4Params("FormInput", params);
  if (!parsed) {
    throw createDispatcherError("INVALID_REQUEST", "Invalid params for action FormInput", false, {
      action: "FormInput"
    });
  }
  return parsed;
}

function ensureTabOperationParams(params: JsonObject): TabOperationParams {
  const parsed = parseTask4Params("TabOperation", params);
  if (!parsed) {
    throw createDispatcherError("INVALID_REQUEST", "Invalid params for action TabOperation", false, {
      action: "TabOperation"
    });
  }
  return parsed;
}

function ensureExtensionOperationParams(params: JsonObject): ExtensionOperationParams {
  const parsed = parseTask4Params("ExtensionsManage", params);
  if (!parsed) {
    throw createDispatcherError("INVALID_REQUEST", "Invalid params for action ExtensionsManage", false, {
      action: "ExtensionsManage"
    });
  }
  return parsed;
}

export function createBrowserActionDispatcher(options: BrowserActionDispatcherOptions): ActionDispatcher {
  return {
    supports(action: string): boolean {
      return isTask4Action(action);
    },
    async dispatch(action, tabId, params, signal): Promise<JsonObject> {
      const task4Action = ensureTask4Action(action);
      const runtime = getObservedRuntime(options.runtime, options.traceLogger, task4Action, tabId);

      if (task4Action === "ComputerBatch") {
        const parsed = ensureComputerBatchParams(params);
        const result = await executeComputerBatch(runtime, tabId, parsed, signal);
        if (typeof result.screenshot_b64 === "string" && result.screenshot_b64.length > 0) {
          await persistComputerBatchScreenshot(options.traceLogger, task4Action, tabId, result.screenshot_b64);
        }
        return result as unknown as JsonObject;
      }

      if (task4Action === "Navigate") {
        const parsed = normalizeNavigateParams(ensureNavigateParams(params));
        const result = await executeNavigate(runtime, tabId, parsed, signal);
        return result as unknown as JsonObject;
      }

      if (task4Action === "FormInput") {
        const parsed = ensureFormInputParams(params);
        const result = await executeFormInput(runtime, tabId, parsed, signal);
        return result as unknown as JsonObject;
      }

      if (task4Action === "ExtensionsManage") {
        const parsed = ensureExtensionOperationParams(params);
        const result = await executeExtensionOperation(runtime, tabId, parsed, signal);
        return result as unknown as JsonObject;
      }

      const tabOperationParams =
        action === "tabs_create"
          ? ({
              ...params,
              operation: typeof params.operation === "string" ? params.operation : "create"
            } satisfies JsonObject)
          : params;
      const parsed = ensureTabOperationParams(tabOperationParams);
      const result = await executeTabOperation(runtime, tabId, parsed, signal);
      return result as unknown as JsonObject;
    },
    getReliabilityHooks(action, tabId, params) {
      const normalizedAction = normalizeTask4Action(action);
      if (!normalizedAction) {
        return undefined;
      }

      if (normalizedAction === "ComputerBatch") {
        const parsed = parseTask4Params(normalizedAction, params);
        if (!parsed || !batchEndsOnClick(parsed)) {
          return undefined;
        }

        const runtime = getObservedRuntime(options.runtime, options.traceLogger, normalizedAction, tabId);
        const baseHooks = buildNavigateReliabilityHooks(runtime, tabId, {
          mode: "advance",
          timeout_ms: undefined
        });

        return {
          ...baseHooks,
          getInflightRequestCount: async () => 0,
          waitFor: async (ctx) => {
            if (
              typeof ctx.result.completed_steps !== "number" ||
              ctx.result.completed_steps < 1 ||
              ctx.result.javascript_dialog
            ) {
              return [];
            }

            return [
              {
                kind: "navigation" as const,
                expected_url: undefined
              },
              {
                kind: "network_idle" as const,
                quiet_ms: ctx.policy.network_idle_quiet_ms
              }
            ];
          }
        };
      }

      if (normalizedAction !== "Navigate") {
        return undefined;
      }

      const parsed = parseTask4Params(normalizedAction, params);
      if (!parsed) {
        return undefined;
      }

      const runtime = getObservedRuntime(options.runtime, options.traceLogger, normalizedAction, tabId);
      const baseHooks = buildNavigateReliabilityHooks(runtime, tabId, normalizeNavigateParams(parsed));
      const skipNetworkIdle = parsed.mode === "to" && isInternalNavigationUrl(parsed.url);

      return {
        ...baseHooks,
        getInflightRequestCount: async () => 0,
        waitFor: async (ctx) => {
          const navigationWait = await baseHooks.waitFor(ctx);
          if (skipNetworkIdle) {
            return navigationWait;
          }
          return [
            ...navigationWait,
            {
              kind: "network_idle" as const,
              quiet_ms: ctx.policy.network_idle_quiet_ms
            }
          ];
        }
      };
    }
  };
}
