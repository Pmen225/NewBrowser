import { describe, expect, it, vi } from "vitest";

interface FetchEventSourceOptions {
  onopen: (response: Response) => Promise<void>;
}

vi.mock("@microsoft/fetch-event-source", () => {
  return {
    EventStreamContentType: "text/event-stream",
    fetchEventSource: async (_url: string, options: FetchEventSourceOptions & { onerror?: (error: unknown) => unknown }) => {
      (globalThis as Record<string, unknown>).__TEST_LAST_FETCH_EVENT_SOURCE_URL__ = _url;
      const response = (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__;
      if (!(response instanceof Response)) {
        throw new Error("Missing test response");
      }
      try {
        await options.onopen(response);
      } catch (error) {
        try {
          const result = options.onerror?.(error);
          (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__ = result;
          if (result instanceof Promise) {
            await result;
          }
          return;
        } catch (onErrorFailure) {
          (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__ = onErrorFailure;
          throw onErrorFailure;
        }
      }
    }
  };
});

import { connectSse } from "../../web/src/lib/realtime/sseClient";

let activeResponse = new Response("", {
  status: 200,
  headers: {
    "content-type": "text/event-stream"
  }
});

function installBrowserGlobals(): () => void {
  const previousWindow = (globalThis as Record<string, unknown>).window;
  const previousDocument = (globalThis as Record<string, unknown>).document;

  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).document = {};

  (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__ = activeResponse;
  delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__;
  delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__;
  delete (globalThis as Record<string, unknown>).__TEST_LAST_FETCH_EVENT_SOURCE_URL__;

  return () => {
    if (previousWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = previousWindow;
    }

    if (previousDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      (globalThis as Record<string, unknown>).document = previousDocument;
    }

    delete (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__;
    delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__;
    delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__;
    delete (globalThis as Record<string, unknown>).__TEST_LAST_FETCH_EVENT_SOURCE_URL__;
  };
}

async function flushTasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("connectSse browser onopen retry classification", () => {
  it("treats 429 and 5xx responses as retriable", async () => {
    const restoreGlobals = installBrowserGlobals();
    try {
      for (const status of [429, 503]) {
        activeResponse = new Response("", {
          status,
          headers: {
            "content-type": "text/event-stream"
          }
        });
        (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__ = activeResponse;
        delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__;
        delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__;

        const errors: unknown[] = [];
        const disconnect = connectSse({
          url: "https://example.test/events",
          onEvent: () => {
            return;
          },
          onError: (error) => {
            errors.push(error);
          }
        });

        await flushTasks();
        disconnect();

        expect(errors).toHaveLength(1);
        expect((errors[0] as Error).message).toBe(`SSE connection failed: HTTP ${status}`);
        const retryDelay = (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__;
        expect(typeof retryDelay).toBe("number");
        expect((globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__).toBeUndefined();
      }
    } finally {
      restoreGlobals();
    }
  });

  it("treats 4xx client errors other than 429 as fatal", async () => {
    const restoreGlobals = installBrowserGlobals();
    try {
      activeResponse = new Response("", {
        status: 404,
        headers: {
          "content-type": "text/event-stream"
        }
      });
      (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__ = activeResponse;
      delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__;
      delete (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__;

      const errors: unknown[] = [];
      const disconnect = connectSse({
        url: "https://example.test/events",
        onEvent: () => {
          return;
        },
        onError: (error) => {
          errors.push(error);
        }
      });

      await flushTasks();
      disconnect();

      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.every((entry) => (entry as Error).message === "SSE connection failed: HTTP 404")).toBe(true);
      expect((globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_RETURN__).toBeUndefined();
      const thrown = (globalThis as Record<string, unknown>).__TEST_SSE_ONERROR_THROW__;
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toBe("SSE connection failed: HTTP 404");
    } finally {
      restoreGlobals();
    }
  });

  it("accepts relative SSE URLs", async () => {
    const restoreGlobals = installBrowserGlobals();
    try {
      activeResponse = new Response("", {
        status: 200,
        headers: {
          "content-type": "text/event-stream"
        }
      });
      (globalThis as Record<string, unknown>).__TEST_ACTIVE_SSE_RESPONSE__ = activeResponse;

      const disconnect = connectSse({
        url: "/api/sse",
        onEvent: () => {
          return;
        }
      });

      await flushTasks();
      disconnect();

      expect((globalThis as Record<string, unknown>).__TEST_LAST_FETCH_EVENT_SOURCE_URL__).toBe("/api/sse");
    } finally {
      restoreGlobals();
    }
  });
});
