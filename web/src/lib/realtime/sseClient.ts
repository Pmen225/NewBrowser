import { EventStreamContentType, fetchEventSource, type EventSourceMessage } from "@microsoft/fetch-event-source";

import { normalizeDeploymentConfig } from "../../../../shared/src/realtime/deployment-config";
import {
  resolveRealtimePolicy,
  type DeploymentMode,
  type WebSocketMode
} from "../../../../shared/src/realtime/provider-policy";
import { parseSseDataFromJson, type SseEnvelope } from "../../../../shared/src/transport";

class FatalSseError extends Error {}
class RetriableSseError extends Error {}

interface ParsedRawEvent {
  id?: string;
  event?: string;
  data?: string;
  retry?: number;
}

export interface ConnectSseOptions {
  url: string;
  onEvent: (event: SseEnvelope) => void;
  onError?: (error: unknown) => void;
  signal?: AbortSignal;
  deploymentMode?: DeploymentMode | string;
  webSocketMode?: WebSocketMode | string;
  headers?: Record<string, string>;
  lastEventId?: string;
  initialRetryMs?: number;
  maxRetryMs?: number;
}

function isAbortLikeError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError") {
      return true;
    }
    if (typeof err.message === "string" && err.message.toLowerCase().includes("abort")) {
      return true;
    }
  }

  return false;
}

function parseEventBlock(block: string): ParsedRawEvent | null {
  const event: ParsedRawEvent = {};
  const dataLines: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    const valueWithOptionalSpace = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";
    const value = valueWithOptionalSpace.startsWith(" ") ? valueWithOptionalSpace.slice(1) : valueWithOptionalSpace;

    if (field === "data") {
      dataLines.push(value);
      continue;
    }

    if (field === "event") {
      event.event = value;
      continue;
    }

    if (field === "id") {
      if (!value.includes("\0")) {
        event.id = value;
      }
      continue;
    }

    if (field === "retry") {
      const retryMs = Number.parseInt(value, 10);
      if (Number.isFinite(retryMs) && retryMs >= 0) {
        event.retry = retryMs;
      }
    }
  }

  if (dataLines.length > 0) {
    event.data = dataLines.join("\n");
  }

  return event.data ? event : null;
}

async function consumeSseStream(
  response: Response,
  onEvent: (event: ParsedRawEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new FatalSseError("SSE response did not include a readable stream body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r/g, "");

    let delimiterIndex = buffer.indexOf("\n\n");
    while (delimiterIndex >= 0) {
      const block = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);
      delimiterIndex = buffer.indexOf("\n\n");

      const parsed = parseEventBlock(block);
      if (parsed) {
        onEvent(parsed);
      }
    }
  }
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }

  await new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function connectSse(options: ConnectSseOptions): () => void {
  const internalController = new AbortController();
  const minRetryMs = options.initialRetryMs ?? 250;
  const maxRetryMs = options.maxRetryMs ?? 5_000;
  const deploymentConfig = normalizeDeploymentConfig(
    {
      deploymentMode: options.deploymentMode,
      webSocketMode: options.webSocketMode,
      sseUrl: options.url
    },
    {
      require: "sse"
    }
  );
  const policy = resolveRealtimePolicy(deploymentConfig.deploymentMode);
  let manuallyClosed = false;

  if (!policy.allowsSse) {
    throw new FatalSseError(
      `SSE transport is not available for deployment mode: ${deploymentConfig.deploymentMode}`
    );
  }

  if (options.signal) {
    options.signal.addEventListener(
      "abort",
      () => {
        internalController.abort(options.signal?.reason);
      },
      { once: true }
    );
  }

  const isBrowserRuntime = typeof window !== "undefined" && typeof document !== "undefined";

  if (isBrowserRuntime) {
    let attempts = 0;
    const baseHeaders = {
      Accept: "text/event-stream",
      ...(deploymentConfig.deploymentMode === "vercel" ? { "Cache-Control": "no-cache" } : {})
    };

    void fetchEventSource(deploymentConfig.sseUrl, {
      signal: internalController.signal,
      openWhenHidden: true,
      headers: {
        ...baseHeaders,
        ...(options.lastEventId ? { "Last-Event-ID": options.lastEventId } : {}),
        ...(options.headers ?? {})
      },
      async onopen(response) {
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new FatalSseError(`SSE connection failed: HTTP ${response.status}`);
          }
          throw new RetriableSseError(`SSE connection failed: HTTP ${response.status}`);
        }
        if (!contentType.includes(EventStreamContentType)) {
          throw new FatalSseError(`Expected event stream content-type, got: ${contentType}`);
        }
        attempts = 0;
      },
      onmessage(message: EventSourceMessage) {
        if (!message.data) {
          return;
        }

        const parsed = parseSseDataFromJson(message.data);
        if (!parsed) {
          throw new FatalSseError("Received invalid SSE JSON payload");
        }

        options.onEvent({
          id: message.id,
          event: message.event || "message",
          retry: message.retry,
          data: parsed
        });
      },
      onclose() {
        if (manuallyClosed || internalController.signal.aborted) {
          return;
        }
        throw new RetriableSseError("SSE connection closed unexpectedly");
      },
      onerror(error) {
        if (manuallyClosed || internalController.signal.aborted) {
          return;
        }
        if (isAbortLikeError(error)) {
          return;
        }

        options.onError?.(error);

        if (error instanceof FatalSseError) {
          throw error;
        }

        attempts += 1;
        const nextDelay = Math.min(minRetryMs * 2 ** (attempts - 1), maxRetryMs);
        return nextDelay;
      }
    }).catch((error: unknown) => {
      if (isAbortLikeError(error)) {
        return;
      }
      options.onError?.(error);
    });
  } else {
    void (async () => {
      let attempts = 0;
      let lastEventId = options.lastEventId;
      let serverRetryMs: number | undefined;
      const baseHeaders = {
        Accept: "text/event-stream",
        ...(deploymentConfig.deploymentMode === "vercel" ? { "Cache-Control": "no-cache" } : {})
      };

      while (!manuallyClosed && !internalController.signal.aborted) {
        try {
          const response = await fetch(deploymentConfig.sseUrl, {
            headers: {
              ...baseHeaders,
              ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
              ...(options.headers ?? {})
            },
            signal: internalController.signal
          });

          const contentType = response.headers.get("content-type") ?? "";
          if (!response.ok) {
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              throw new FatalSseError(`SSE connection failed: HTTP ${response.status}`);
            }
            throw new RetriableSseError(`SSE connection failed: HTTP ${response.status}`);
          }

          if (!contentType.includes(EventStreamContentType)) {
            throw new FatalSseError(`Expected event stream content-type, got: ${contentType}`);
          }

          attempts = 0;

          await consumeSseStream(response, (event) => {
            if (event.id) {
              lastEventId = event.id;
            }
            if (event.retry !== undefined) {
              serverRetryMs = event.retry;
            }
            if (!event.data) {
              return;
            }

            const parsed = parseSseDataFromJson(event.data);
            if (!parsed) {
              throw new FatalSseError("Received invalid SSE JSON payload");
            }

            options.onEvent({
              id: event.id ?? "",
              event: event.event ?? "message",
              retry: event.retry,
              data: parsed
            });
          });

          if (manuallyClosed || internalController.signal.aborted) {
            break;
          }

          throw new RetriableSseError("SSE connection closed unexpectedly");
        } catch (error) {
          if (manuallyClosed || internalController.signal.aborted || isAbortLikeError(error)) {
            break;
          }

          options.onError?.(error);

          if (error instanceof FatalSseError) {
            break;
          }

          attempts += 1;
          const exponentialDelay = Math.min(minRetryMs * 2 ** (attempts - 1), maxRetryMs);
          const retryDelay =
            serverRetryMs !== undefined
              ? Math.min(Math.max(serverRetryMs, minRetryMs), maxRetryMs)
              : exponentialDelay;

          await sleep(retryDelay, internalController.signal);
        }
      }
    })();
  }

  return () => {
    manuallyClosed = true;
    internalController.abort();
  };
}
