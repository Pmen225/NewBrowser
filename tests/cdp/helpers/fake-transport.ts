import type { ICdpTransport } from "../../../src/cdp/types";

interface QueuedResponse {
  value?: unknown;
  error?: Error;
}

interface SendCall {
  method: string;
  params?: object;
  sessionId?: string;
}

export class FakeTransport implements ICdpTransport {
  private readonly responseQueue = new Map<string, QueuedResponse[]>();
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();

  readonly sendCalls: SendCall[] = [];

  queueResponse(method: string, value: unknown): void {
    const entries = this.responseQueue.get(method) ?? [];
    entries.push({ value });
    this.responseQueue.set(method, entries);
  }

  queueError(method: string, error: Error): void {
    const entries = this.responseQueue.get(method) ?? [];
    entries.push({ error });
    this.responseQueue.set(method, entries);
  }

  async send<T>(method: string, params?: object, sessionId?: string): Promise<T> {
    this.sendCalls.push({ method, params, sessionId });
    const entries = this.responseQueue.get(method) ?? [];

    if (
      method === "Page.addScriptToEvaluateOnNewDocument" &&
      typeof (params as { source?: unknown } | undefined)?.source === "string" &&
      ((params as { source: string }).source.includes("__atlasConsentSweep") ||
        (params as { source: string }).source.includes("navigator.webdriver"))
    ) {
      return {} as T;
    }

    if (
      method === "Runtime.evaluate" &&
      typeof (params as { expression?: unknown } | undefined)?.expression === "string" &&
      ((params as { expression: string }).expression.includes("__atlasConsentSweep") ||
        (params as { expression: string }).expression.includes("navigator.webdriver"))
    ) {
      return {} as T;
    }

    const next = entries.shift();
    this.responseQueue.set(method, entries);

    if (!next) {
      throw new Error(`No queued response for method: ${method}`);
    }

    if (next.error) {
      throw next.error;
    }

    return next.value as T;
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

  async emit(event: string, payload: unknown): Promise<void> {
    const listeners = this.handlers.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      await listener(payload);
    }
  }
}
