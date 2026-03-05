import WebSocket from "ws";

import type { ICdpTransport } from "../../../src/cdp/types";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface ChromeCdpErrorPayload {
  code?: number;
  message?: string;
  data?: unknown;
}

interface ChromeCdpMessage {
  id?: number;
  method?: string;
  params?: unknown;
  sessionId?: string;
  result?: unknown;
  error?: ChromeCdpErrorPayload;
}

function createCdpError(
  method: string,
  errorPayload: ChromeCdpErrorPayload | undefined
): Error & { code?: number; details?: unknown } {
  const message = errorPayload?.message ?? "CDP request failed";
  const error = new Error(`[${method}] ${message}`) as Error & {
    code?: number;
    details?: unknown;
  };
  if (typeof errorPayload?.code === "number") {
    error.code = errorPayload.code;
  }
  if (errorPayload?.data !== undefined) {
    error.details = errorPayload.data;
  }
  return error;
}

function normalizeRawMessage(raw: WebSocket.RawData): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf8");
  }
  if (raw instanceof ArrayBuffer) {
    return new TextDecoder().decode(raw);
  }
  if (ArrayBuffer.isView(raw)) {
    return new TextDecoder().decode(raw);
  }
  return Buffer.from(raw).toString("utf8");
}

export interface ChromeCdpTransportOptions {
  wsUrl: string;
  connectTimeoutMs?: number;
}

export class ChromeCdpTransport implements ICdpTransport {
  private readonly wsUrl: string;
  private readonly connectTimeoutMs: number;
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();
  private readonly pending = new Map<number, PendingRequest>();
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private nextMessageId = 0;

  constructor(options: ChromeCdpTransportOptions) {
    this.wsUrl = options.wsUrl;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 10_000;
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.wsUrl);
      let settled = false;

      const settleResolve = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      const settleReject = (error: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      };

      const timer = setTimeout(() => {
        settleReject(new Error(`Timed out connecting to Chrome CDP after ${this.connectTimeoutMs}ms`));
        socket.close(1000, "Connect timeout");
      }, this.connectTimeoutMs);

      if (typeof timer.unref === "function") {
        timer.unref();
      }

      const cleanup = (): void => {
        clearTimeout(timer);
      };

      socket.on("open", () => {
        cleanup();
        this.socket = socket;
        settleResolve();
      });

      socket.on("error", () => {
        cleanup();
        settleReject(new Error("Failed to connect to Chrome CDP WebSocket"));
      });

      socket.on("close", () => {
        cleanup();
        if (!settled) {
          settleReject(new Error("Chrome CDP WebSocket closed before opening"));
        }
        if (this.socket === socket) {
          this.socket = null;
        }
        this.rejectAllPending(new Error("Chrome CDP WebSocket closed"));
      });

      socket.on("message", (raw) => {
        const normalized = normalizeRawMessage(raw);
        let parsed: ChromeCdpMessage;
        try {
          parsed = JSON.parse(normalized) as ChromeCdpMessage;
        } catch {
          return;
        }

        if (typeof parsed.id === "number") {
          const pending = this.pending.get(parsed.id);
          if (!pending) {
            return;
          }
          this.pending.delete(parsed.id);
          if (parsed.error) {
            pending.reject(createCdpError("unknown", parsed.error));
            return;
          }
          pending.resolve(parsed.result);
          return;
        }

        if (typeof parsed.method === "string") {
          this.emit(parsed.method, {
            sessionId: parsed.sessionId,
            params: parsed.params
          });
        }
      });
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  async close(): Promise<void> {
    const socket = this.socket;
    this.socket = null;

    if (!socket) {
      return;
    }

    await new Promise<void>((resolve) => {
      socket.once("close", () => {
        resolve();
      });
      socket.close(1000, "Client closing");

      const timer = setTimeout(() => {
        resolve();
      }, 250);

      if (typeof timer.unref === "function") {
        timer.unref();
      }
    });

    this.rejectAllPending(new Error("Chrome CDP transport closed"));
  }

  async send<T>(method: string, params?: object, sessionId?: string): Promise<T> {
    await this.connect();
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Chrome CDP transport is not connected");
    }

    this.nextMessageId += 1;
    const id = this.nextMessageId;

    const responsePromise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
    });

    const payload: Record<string, unknown> = {
      id,
      method
    };
    if (params) {
      payload.params = params;
    }
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    try {
      socket.send(JSON.stringify(payload));
    } catch (error) {
      this.pending.delete(id);
      throw error instanceof Error ? error : new Error("Failed to send CDP request");
    }

    try {
      return await responsePromise;
    } catch (error) {
      if (error && typeof error === "object" && "code" in (error as Record<string, unknown>)) {
        throw error;
      }
      throw createCdpError(method, { message: error instanceof Error ? error.message : String(error) });
    }
  }

  on(event: string, handler: (payload: unknown) => void): void {
    const listeners = this.handlers.get(event) ?? new Set<(payload: unknown) => void>();
    listeners.add(handler);
    this.handlers.set(event, listeners);
  }

  off(event: string, handler: (payload: unknown) => void): void {
    const listeners = this.handlers.get(event);
    if (!listeners) {
      return;
    }
    listeners.delete(handler);
    if (listeners.size === 0) {
      this.handlers.delete(event);
    }
  }

  private emit(event: string, payload: unknown): void {
    const listeners = this.handlers.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(payload);
    }
  }

  private rejectAllPending(error: Error): void {
    for (const entry of this.pending.values()) {
      entry.reject(error);
    }
    this.pending.clear();
  }
}
