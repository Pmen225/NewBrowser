import { parseGetPageTextParams, type GetPageTextParams, type JsonObject } from "../../../shared/src/transport";
import type { TabRecord } from "../../../src/cdp/types";
import type { ActionDispatcher } from "./dispatcher";

export interface GetPageTextDispatcherOptions {
  getTab: (tabId: string) => TabRecord | undefined;
  send: <T>(method: string, params?: object, sessionId?: string) => Promise<T>;
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

function resolveRequestedTabId(defaultTabId: string, parsed: GetPageTextParams): string {
  if (parsed.tab_id && parsed.tab_id.trim().length > 0) {
    return parsed.tab_id;
  }
  return defaultTabId;
}

function readTextValue(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const result = (payload as { result?: { value?: unknown } }).result;
  if (!result || typeof result !== "object") {
    return "";
  }

  const value = result.value;
  return typeof value === "string" ? value : "";
}

export function createGetPageTextDispatcher(options: GetPageTextDispatcherOptions): ActionDispatcher {
  return {
    supports(action: string): boolean {
      return action === "get_page_text" || action === "GetPageText";
    },
    async dispatch(action: string, tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "get_page_text" && action !== "GetPageText") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsed = parseGetPageTextParams(params);
      if (!parsed) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid get_page_text params", false);
      }

      const requestedTabId = resolveRequestedTabId(tabId, parsed);
      let resolvedTabId = requestedTabId;
      let tab = options.getTab(requestedTabId);
      if (!tab && requestedTabId !== tabId) {
        resolvedTabId = tabId;
        tab = options.getTab(tabId);
      }
      if (!tab) {
        throw createDispatcherError("TAB_NOT_FOUND", `No active CDP session for tab_id=${resolvedTabId}`, false, {
          tab_id: resolvedTabId
        });
      }

      const evaluateResult = await options.send<unknown>(
        "Runtime.evaluate",
        {
          expression:
            "(function(){const body=document.body; if(!body){return '';} const text=(body.innerText||'').trim(); return text;})()",
          returnByValue: true,
          awaitPromise: true
        },
        tab.sessionId
      );

      const fullText = readTextValue(evaluateResult);
      const maxChars =
        typeof parsed.max_chars === "number" && Number.isFinite(parsed.max_chars) && parsed.max_chars > 0
          ? Math.floor(parsed.max_chars)
          : 20000;
      const truncated = fullText.length > maxChars;

      return {
        text: truncated ? fullText.slice(0, maxChars) : fullText,
        truncated
      };
    }
  };
}
