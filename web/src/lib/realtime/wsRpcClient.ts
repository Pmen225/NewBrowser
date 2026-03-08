import { parseRpcResponse, type JsonObject, type RpcErrorResponse, type RpcRequest } from "../../../../shared/src/transport";
import { normalizeDeploymentConfig } from "../../../../shared/src/realtime/deployment-config";
import {
  assertDirectWebSocketAllowed,
  type DeploymentMode,
  type WebSocketMode
} from "../../../../shared/src/realtime/provider-policy";

interface BrowserLikeWebSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?: (...args: any[]) => void;
  removeEventListener?: (...args: any[]) => void;
  on?: (...args: any[]) => void;
  off?: (...args: any[]) => void;
}

interface PendingRequest {
  timeout: ReturnType<typeof setTimeout>;
  resolve: (value: JsonObject) => void;
  reject: (error: Error) => void;
}

export interface RpcClientError extends Error {
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface CreateWsRpcClientOptions {
  url: string;
  timeoutMs?: number;
  connectTimeoutMs?: number;
  deploymentMode?: DeploymentMode | string;
  webSocketMode?: WebSocketMode | string;
  hostedProvider?: string;
  webSocketFactory?: (url: string) => BrowserLikeWebSocket;
}

export interface WsRpcClient {
  call: (action: string, tabId: string, params: JsonObject) => Promise<JsonObject>;
  close: () => Promise<void>;
}

function createRequestId(): string {
  const random = globalThis.crypto;
  if (random && typeof random.randomUUID === "function") {
    return random.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addListener(socket: BrowserLikeWebSocket, event: string, listener: (...args: unknown[]) => void): void {
  if (socket.addEventListener) {
    socket.addEventListener(event, listener);
    return;
  }

  socket.on?.(event, listener);
}

function removeListener(socket: BrowserLikeWebSocket, event: string, listener: (...args: unknown[]) => void): void {
  if (socket.removeEventListener) {
    socket.removeEventListener(event, listener);
    return;
  }

  socket.off?.(event, listener);
}

function createRpcClientError(response: RpcErrorResponse): RpcClientError {
  const error = new Error(response.error.message) as RpcClientError;
  error.code = response.error.code;
  error.retryable = response.retryable;
  error.details = response.error.details;
  return error;
}

function normalizeMessagePayload(raw: unknown): string | null {
  if (typeof raw === "string") {
    return raw;
  }

  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    const eventData = (raw as { data: unknown }).data;
    if (typeof eventData === "string") {
      return eventData;
    }
    if (eventData instanceof ArrayBuffer) {
      return new TextDecoder().decode(eventData);
    }
    if (ArrayBuffer.isView(eventData)) {
      return new TextDecoder().decode(eventData);
    }
  }

  if (raw instanceof ArrayBuffer) {
    return new TextDecoder().decode(raw);
  }

  if (ArrayBuffer.isView(raw)) {
    return new TextDecoder().decode(raw);
  }

  return null;
}

export function createWsRpcClient(options: CreateWsRpcClientOptions): WsRpcClient {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const connectTimeoutMs = options.connectTimeoutMs ?? 10_000;
  const deploymentConfig = normalizeDeploymentConfig(
    {
      deploymentMode: options.deploymentMode,
      webSocketMode: options.webSocketMode,
      wsUrl: options.url,
      hostedProvider: options.hostedProvider
    },
    {
      require: "ws"
    }
  );
  const factory = options.webSocketFactory ?? ((url: string) => new WebSocket(url));

  if (deploymentConfig.webSocketMode === "direct") {
    assertDirectWebSocketAllowed(deploymentConfig.deploymentMode, deploymentConfig.wsUrl);
  }

  let socket: BrowserLikeWebSocket | null = null;
  let connectPromise: Promise<BrowserLikeWebSocket> | null = null;

  const pending = new Map<string, PendingRequest>();

  const rejectAll = (error: Error): void => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(error);
    }
    pending.clear();
  };

  const connect = async (): Promise<BrowserLikeWebSocket> => {
    if (socket && socket.readyState === 1) {
      return socket;
    }

    if (connectPromise) {
      return connectPromise;
    }

    connectPromise = new Promise<BrowserLikeWebSocket>((resolve, reject) => {
      const ws = factory(deploymentConfig.wsUrl);
      let opened = false;
      let settled = false;

      const settleResolve = (value: BrowserLikeWebSocket): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };

      const settleReject = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      };

      const connectTimer = setTimeout(() => {
        settleReject(new Error(`Timed out connecting to WebSocket after ${connectTimeoutMs}ms`));
        ws.close(1000, "Connect timeout");
      }, connectTimeoutMs);

      if (typeof (connectTimer as NodeJS.Timeout).unref === "function") {
        (connectTimer as NodeJS.Timeout).unref();
      }

      const cleanupOpenListeners = (): void => {
        clearTimeout(connectTimer);
        removeListener(ws, "open", onOpen);
        removeListener(ws, "error", onError);
      };

      const onOpen = () => {
        opened = true;
        cleanupOpenListeners();
        socket = ws;
        settleResolve(ws);
      };

      const onError = () => {
        cleanupOpenListeners();
        settleReject(new Error("Failed to connect WebSocket RPC client"));
      };

      addListener(ws, "open", onOpen);
      addListener(ws, "error", onError);

      addListener(ws, "close", () => {
        cleanupOpenListeners();
        socket = null;
        connectPromise = null;
        if (!opened) {
          settleReject(new Error("WebSocket connection closed before opening"));
        }
        rejectAll(new Error("WebSocket connection closed"));
      });

      addListener(ws, "message", (eventPayload: unknown) => {
        const rawMessage = normalizeMessagePayload(eventPayload);
        if (!rawMessage) {
          return;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(rawMessage) as unknown;
        } catch {
          return;
        }

        const response = parseRpcResponse(parsedJson);
        if (!response) {
          return;
        }

        const pendingRequest = pending.get(response.request_id);
        if (!pendingRequest) {
          return;
        }

        pending.delete(response.request_id);
        clearTimeout(pendingRequest.timeout);

        if (response.ok) {
          pendingRequest.resolve(response.result);
          return;
        }

        pendingRequest.reject(createRpcClientError(response));
      });
    }).finally(() => {
      connectPromise = null;
    });

    return connectPromise;
  };

  const call = async (action: string, tabId: string, params: JsonObject): Promise<JsonObject> => {
    const ws = await connect();
    const requestId = createRequestId();

    if (ws.readyState !== 1) {
      throw new Error("WebSocket is not open");
    }

    const request: RpcRequest = {
      request_id: requestId,
      action,
      tab_id: tabId,
      params
    };

    const responsePromise = new Promise<JsonObject>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        const timeoutError = new Error(`RPC request timed out after ${timeoutMs}ms`) as RpcClientError;
        timeoutError.code = "REQUEST_TIMEOUT";
        timeoutError.retryable = true;
        reject(timeoutError);
      }, timeoutMs);

      pending.set(requestId, {
        timeout,
        resolve,
        reject
      });
    });

    try {
      ws.send(JSON.stringify(request));
    } catch (error) {
      const pendingRequest = pending.get(requestId);
      if (pendingRequest) {
        pending.delete(requestId);
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(error instanceof Error ? error : new Error("Failed to send RPC message"));
      }
    }
    return responsePromise;
  };

  const close = async (): Promise<void> => {
    if (!socket) {
      return;
    }

    const ws = socket;
    socket = null;

    await new Promise<void>((resolve) => {
      const fallbackTimer = setTimeout(() => {
        removeListener(ws, "close", onClose);
        resolve();
      }, 250);

      const clearFallback = (): void => {
        clearTimeout(fallbackTimer);
      };

      const onClose = () => {
        clearFallback();
        removeListener(ws, "close", onClose);
        resolve();
      };

      addListener(ws, "close", onClose);
      ws.close(1000, "Client closing");

      if (typeof (fallbackTimer as NodeJS.Timeout).unref === "function") {
        (fallbackTimer as NodeJS.Timeout).unref();
      }
    });

    rejectAll(new Error("WebSocket client closed"));
  };

  return {
    call,
    close
  };
}
