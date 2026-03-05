import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import WebSocket, { WebSocketServer } from "ws";

import { runWithRpcRequestContext } from "../observability/request-context";
import { redactSensitiveJson } from "../observability/redaction";
import type { TraceLogger } from "../observability/trace-logger";
import type { ActionDispatcher } from "../rpc/dispatcher";
import { executeWithReliability, type ReliabilityPolicy } from "../rpc/reliability";
import {
  createRpcError,
  createRpcSuccess,
  isRecord,
  parseRpcRequest,
  type JsonObject,
  type RpcErrorBody,
  type RpcRequest,
  type RpcResponse
} from "../../../shared/src/transport";

interface RpcConnectionState {
  isAlive: boolean;
  protocolViolations: number;
  windowStartMs: number;
  windowCount: number;
  inFlight: Map<string, AbortController>;
}

export interface RpcWebSocketServerOptions {
  path?: string;
  dispatcher: ActionDispatcher;
  sanitizeResult?: (action: string, result: JsonObject) => JsonObject;
  reliabilityPolicy?: Partial<ReliabilityPolicy>;
  requestTimeoutMs?: number;
  heartbeatMs?: number;
  maxPayloadBytes?: number;
  maxProtocolViolations?: number;
  allowedOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMaxMessages?: number;
  traceLogger?: TraceLogger;
}

function normalizePath(urlPath: string): string {
  return urlPath.endsWith("/") && urlPath.length > 1 ? urlPath.slice(0, -1) : urlPath;
}

function matchesPath(requestUrl: string | undefined, expectedPath: string): boolean {
  if (!requestUrl) {
    return false;
  }

  const pathOnly = requestUrl.split("?")[0] ?? "/";
  return normalizePath(pathOnly) === normalizePath(expectedPath);
}

function toRpcError(error: unknown): RpcErrorBody & { retryable: boolean } {
  if (error && typeof error === "object") {
    const err = error as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      retryable?: unknown;
    };

    if (typeof err.code === "string" && typeof err.message === "string") {
      return {
        code: err.code,
        message: err.message,
        details: err.details && typeof err.details === "object" ? (err.details as Record<string, unknown>) : undefined,
        retryable: err.retryable === true
      };
    }

    if (typeof err.message === "string") {
      return {
        code: "INTERNAL_ERROR",
        message: err.message,
        retryable: false
      };
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected RPC error",
    retryable: false
  };
}

function sendResponse(socket: WebSocket, response: RpcResponse): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(response));
}

function failRequest(
  socket: WebSocket,
  requestId: string,
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): void {
  sendResponse(socket, createRpcError(requestId, code, message, retryable, details));
}

function toTraceError(code: string, message: string, retryable: boolean, details?: Record<string, unknown>): JsonObject {
  return {
    code,
    message,
    retryable,
    ...(details ? { details } : {})
  };
}

async function traceLog(
  traceLogger: TraceLogger | undefined,
  input: Parameters<TraceLogger["log"]>[0]
): Promise<void> {
  if (!traceLogger) {
    return;
  }

  try {
    await traceLogger.log({
      ...input,
      params: redactSensitiveJson(input.params),
      result: redactSensitiveJson(input.result),
      error: redactSensitiveJson(input.error)
    });
  } catch {
    return;
  }
}

export function createRpcWebSocketServer(options: RpcWebSocketServerOptions) {
  const path = options.path ?? "/rpc";
  const requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const maxProtocolViolations = options.maxProtocolViolations ?? 3;
  const rateLimitWindowMs = options.rateLimitWindowMs ?? 10_000;
  const rateLimitMaxMessages = options.rateLimitMaxMessages ?? 120;
  const allowedOrigins = options.allowedOrigins;

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: options.maxPayloadBytes ?? 1_048_576
  });

  const connectionState = new WeakMap<WebSocket, RpcConnectionState>();

  const markViolation = (socket: WebSocket, state: RpcConnectionState): void => {
    state.protocolViolations += 1;
    if (state.protocolViolations > maxProtocolViolations) {
      socket.close(1008, "Protocol violation");
    }
  };

  const isRateLimited = (state: RpcConnectionState): boolean => {
    const now = Date.now();
    if (now - state.windowStartMs > rateLimitWindowMs) {
      state.windowStartMs = now;
      state.windowCount = 0;
    }

    state.windowCount += 1;
    return state.windowCount > rateLimitMaxMessages;
  };

  const processRequest = async (socket: WebSocket, request: RpcRequest, state: RpcConnectionState): Promise<void> => {
    await traceLog(options.traceLogger, {
      request_id: request.request_id,
      action: request.action,
      tab_id: request.tab_id,
      event: "rpc.request",
      params: request.params
    });

    if (state.inFlight.has(request.request_id)) {
      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: request.tab_id,
        event: "rpc.error",
        error: toTraceError("DUPLICATE_REQUEST_ID", "Duplicate in-flight request_id", false)
      });
      failRequest(socket, request.request_id, "DUPLICATE_REQUEST_ID", "Duplicate in-flight request_id", false);
      return;
    }

    if (options.dispatcher.supports && !options.dispatcher.supports(request.action)) {
      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: request.tab_id,
        event: "rpc.error",
        error: toTraceError("UNKNOWN_ACTION", `Unknown action: ${request.action}`, false)
      });
      failRequest(socket, request.request_id, "UNKNOWN_ACTION", `Unknown action: ${request.action}`, false);
      return;
    }

    const controller = new AbortController();
    state.inFlight.set(request.request_id, controller);

    let finalized = false;
    const finalize = (): boolean => {
      if (finalized) {
        return false;
      }

      finalized = true;
      state.inFlight.delete(request.request_id);
      return true;
    };

    const timeout = setTimeout(() => {
      void (async () => {
        controller.abort();
        if (!finalize()) {
          return;
        }
        await traceLog(options.traceLogger, {
          request_id: request.request_id,
          action: request.action,
          tab_id: request.tab_id,
          event: "rpc.error",
          error: toTraceError("REQUEST_TIMEOUT", "Request timed out", true)
        });
        failRequest(socket, request.request_id, "REQUEST_TIMEOUT", "Request timed out", true);
      })();
    }, requestTimeoutMs);

    if (typeof timeout.unref === "function") {
      timeout.unref();
    }

    try {
      const hooks = options.dispatcher.getReliabilityHooks?.(request.action, request.tab_id, request.params);

      const reliabilityResult = await runWithRpcRequestContext(
        {
          request_id: request.request_id,
          action: request.action,
          tab_id: request.tab_id,
          params: request.params
        },
        () =>
          executeWithReliability({
            action: request.action,
            tab_id: request.tab_id,
            params: request.params,
            signal: controller.signal,
            policy: options.reliabilityPolicy,
            hooks: {
              ...hooks,
              perform: ({ params }) => options.dispatcher.dispatch(request.action, request.tab_id, params, controller.signal)
            }
          })
      );

      if (!finalize()) {
        return;
      }
      clearTimeout(timeout);
      const sanitizedResult = options.sanitizeResult ? options.sanitizeResult(request.action, reliabilityResult.result) : reliabilityResult.result;
      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: request.tab_id,
        event: "rpc.response",
        result: sanitizedResult
      });
      sendResponse(socket, createRpcSuccess(request.request_id, sanitizedResult));
    } catch (error) {
      if (!finalize()) {
        return;
      }
      clearTimeout(timeout);
      const rpcError = toRpcError(error);
      await traceLog(options.traceLogger, {
        request_id: request.request_id,
        action: request.action,
        tab_id: request.tab_id,
        event: "rpc.error",
        error: toTraceError(rpcError.code, rpcError.message, rpcError.retryable, rpcError.details)
      });
      failRequest(socket, request.request_id, rpcError.code, rpcError.message, rpcError.retryable, rpcError.details);
    }
  };

  wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
    const state: RpcConnectionState = {
      isAlive: true,
      protocolViolations: 0,
      windowStartMs: Date.now(),
      windowCount: 0,
      inFlight: new Map<string, AbortController>()
    };

    connectionState.set(socket, state);

    socket.on("error", () => {
      for (const controller of state.inFlight.values()) {
        controller.abort();
      }
      state.inFlight.clear();
    });

    socket.on("pong", () => {
      state.isAlive = true;
    });

    socket.on("close", () => {
      for (const controller of state.inFlight.values()) {
        controller.abort();
      }
      state.inFlight.clear();
    });

    socket.on("message", async (rawData: WebSocket.RawData) => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawData.toString());
      } catch {
        await traceLog(options.traceLogger, {
          request_id: "invalid-json",
          event: "rpc.error",
          error: toTraceError("INVALID_JSON", "Malformed JSON payload", false)
        });
        failRequest(socket, "invalid-json", "INVALID_JSON", "Malformed JSON payload", false);
        markViolation(socket, state);
        return;
      }

      const requestIdForError =
        isRecord(parsedJson) && typeof parsedJson.request_id === "string"
          ? parsedJson.request_id
          : "rate-limit";

      if (isRateLimited(state)) {
        await traceLog(options.traceLogger, {
          request_id: requestIdForError,
          action: isRecord(parsedJson) && typeof parsedJson.action === "string" ? parsedJson.action : undefined,
          tab_id: isRecord(parsedJson) && typeof parsedJson.tab_id === "string" ? parsedJson.tab_id : undefined,
          event: "rpc.error",
          error: toTraceError("RATE_LIMITED", "Too many RPC messages", true)
        });
        failRequest(socket, requestIdForError, "RATE_LIMITED", "Too many RPC messages", true);
        return;
      }

      const requestPayload = parseRpcRequest(parsedJson);
      if (!requestPayload) {
        await traceLog(options.traceLogger, {
          request_id: "invalid-request",
          event: "rpc.error",
          error: toTraceError("INVALID_REQUEST", "RPC payload does not match expected shape", false)
        });
        failRequest(socket, "invalid-request", "INVALID_REQUEST", "RPC payload does not match expected shape", false);
        markViolation(socket, state);
        return;
      }

      void processRequest(socket, requestPayload, state).catch(async (error) => {
        const rpcError = toRpcError(error);
        await traceLog(options.traceLogger, {
          request_id: requestPayload.request_id,
          action: requestPayload.action,
          tab_id: requestPayload.tab_id,
          event: "rpc.error",
          error: toTraceError(rpcError.code, rpcError.message, rpcError.retryable, rpcError.details)
        });
        failRequest(socket, requestPayload.request_id, rpcError.code, rpcError.message, rpcError.retryable, rpcError.details);
      });
    });

    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = request.headers.origin;
      if (!origin || !allowedOrigins.includes(origin)) {
        socket.close(1008, "Origin not allowed");
      }
    }
  });

  const heartbeat = heartbeatMs > 0
    ? setInterval(() => {
        for (const socket of wss.clients) {
          const state = connectionState.get(socket);
          if (!state) {
            continue;
          }

          if (!state.isAlive) {
            socket.terminate();
            continue;
          }

          state.isAlive = false;
          socket.ping();
        }
      }, heartbeatMs)
    : undefined;

  if (heartbeat && typeof heartbeat.unref === "function") {
    heartbeat.unref();
  }

  const handleUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    if (!matchesPath(request.url, path)) {
      socket.destroy();
      return;
    }

    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = request.headers.origin;
      if (!origin || !allowedOrigins.includes(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, request);
    });
  };

  const close = async (): Promise<void> => {
    if (heartbeat) {
      clearInterval(heartbeat);
    }

    for (const socket of wss.clients) {
      socket.close(1001, "Server shutdown");
    }

    await new Promise<void>((resolve) => {
      wss.close(() => {
        resolve();
      });
    });
  };

  return {
    handleUpgrade,
    close
  };
}
