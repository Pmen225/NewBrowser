import { randomUUID } from "node:crypto";

import type { JsonObject } from "../../../shared/src/transport";
import { getRpcRequestContext } from "../observability/request-context";
import { recordReadPageTraceArtifacts } from "../observability/read-page-trace";
import type { TraceLogger } from "../observability/trace-logger";
import type { CdpClient, ReadPageRequest } from "../../../src/sidecar/read-page/types";
import { handleReadPageTool } from "../../../src/sidecar/tools/read-page-tool";
import { parseRefId } from "../../../src/sidecar/tools/browser-action-types";
import type { ActionDispatcher } from "./dispatcher";

export interface ReadPageDispatcherOptions {
  getClientForTab: (tabId: string) => CdpClient | undefined;
  traceLogger?: TraceLogger;
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

function parseReadPageParams(params: JsonObject): ReadPageRequest["params"] | null {
  const depth = params.depth;
  if (depth !== undefined) {
    if (typeof depth !== "number" || !Number.isFinite(depth) || depth <= 0) {
      return null;
    }
  }

  const filter = params.filter;
  if (filter !== undefined && filter !== "interactive" && filter !== "all") {
    return null;
  }

  const refId = params.ref_id;
  if (refId !== undefined) {
    if (typeof refId !== "string" || !parseRefId(refId)) {
      return null;
    }
  }

  const parsed: ReadPageRequest["params"] = {};
  if (depth !== undefined) {
    parsed.depth = Math.floor(depth);
  }
  if (filter !== undefined) {
    parsed.filter = filter;
  }
  if (refId !== undefined) {
    parsed.ref_id = refId;
  }

  return parsed;
}

async function traceLog(
  traceLogger: TraceLogger | undefined,
  input: Parameters<TraceLogger["log"]>[0]
): Promise<void> {
  if (!traceLogger) {
    return;
  }

  try {
    await traceLogger.log(input);
  } catch {
    return;
  }
}

export function createReadPageDispatcher(options: ReadPageDispatcherOptions): ActionDispatcher {
  return {
    supports(action: string): boolean {
      return action === "ReadPage" || action === "read_page";
    },
    async dispatch(action: string, tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "ReadPage" && action !== "read_page") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsedParams = parseReadPageParams(params);
      if (!parsedParams) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid ReadPage params", false, {
          action
        });
      }

      const requestContext = getRpcRequestContext();
      const request: ReadPageRequest = {
        request_id: requestContext?.request_id ?? randomUUID(),
        action: "ReadPage",
        tab_id: tabId,
        params: parsedParams
      };

      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: tabId,
        event: "read_page.request",
        params: parsedParams as unknown as JsonObject
      });

      const response = await handleReadPageTool(
        {
          getClientForTab: options.getClientForTab
        },
        request,
        {
          onResponse: async (nextRequest, nextResponse) => {
            if (!options.traceLogger) {
              return;
            }
            await recordReadPageTraceArtifacts(options.traceLogger, nextRequest, nextResponse);
          }
        }
      );

      if (!response.ok) {
        throw createDispatcherError(response.error.code, response.error.message, response.error.retryable);
      }

      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: tabId,
        event: "read_page.response",
        result: {
          frame_count: response.result.meta.frame_count,
          interactable_count: response.result.meta.interactable_count
        }
      });

      return response.result as unknown as JsonObject;
    }
  };
}
