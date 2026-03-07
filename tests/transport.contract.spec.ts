import { createServer } from "node:http";
import { once } from "node:events";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { createSseHub } from "../sidecar/src/http/events";
import { createBrowserActionDispatcher } from "../sidecar/src/rpc/browser-action-dispatcher";
import { createRpcWebSocketServer } from "../sidecar/src/ws/rpcServer";
import type { ActionDispatcher } from "../sidecar/src/rpc/dispatcher";
import type { BrowserActionRuntime } from "../src/cdp/browser-actions";
import { connectSse } from "../web/src/lib/realtime/sseClient";
import { createWsRpcClient } from "../web/src/lib/realtime/wsRpcClient";
import type { RpcRequest, RpcResponse, SseEnvelope } from "../shared/src/transport";

interface StartedServer {
  origin: string;
  close: () => Promise<void>;
}

async function startServer(routes: {
  eventsHub?: ReturnType<typeof createSseHub>;
  rpcServer?: ReturnType<typeof createRpcWebSocketServer>;
}): Promise<StartedServer> {
  const server = createServer((req, res) => {
    if (req.url === "/events" && routes.eventsHub) {
      routes.eventsHub.handleRequest(req, res);
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  if (routes.rpcServer) {
    server.on("upgrade", routes.rpcServer.handleUpgrade);
  }

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start server");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      if (routes.rpcServer) {
        await routes.rpcServer.close();
      }
      routes.eventsHub?.close();
      server.close();
      await once(server, "close");
    }
  };
}

function parseSseFrames(rawChunk: string): Array<{
  id?: string;
  event?: string;
  data?: string;
  retry?: number;
}> {
  return rawChunk
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const frame: {
        id?: string;
        event?: string;
        data?: string;
        retry?: number;
      } = {};
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith(":")) {
          continue;
        }
        if (line.startsWith("id:")) {
          frame.id = line.slice(3).trim();
          continue;
        }
        if (line.startsWith("event:")) {
          frame.event = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("retry:")) {
          frame.retry = Number(line.slice(6).trim());
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        frame.data = dataLines.join("\n");
      }
      return frame;
    });
}

async function collectFrames(url: string, expectedCount: number, init?: RequestInit): Promise<Array<{
  id?: string;
  event?: string;
  data?: string;
  retry?: number;
}>> {
  const controller = new AbortController();
  const response = await fetch(url, {
    ...init,
    signal: controller.signal,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "text/event-stream"
    }
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")?.includes("text/event-stream")).toBe(true);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Missing response body");
  }

  const decoder = new TextDecoder();
  const frames: Array<{
    id?: string;
    event?: string;
    data?: string;
    retry?: number;
  }> = [];
  let raw = "";

  while (frames.length < expectedCount) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    raw += decoder.decode(value, { stream: true });
    const blocks = raw.split("\n\n");
    raw = blocks.pop() ?? "";

    for (const block of blocks) {
      const parsed = parseSseFrames(`${block}\n\n`);
      frames.push(...parsed);
      if (frames.length >= expectedCount) {
        break;
      }
    }
  }

  controller.abort();
  return frames;
}

async function waitFor(condition: () => boolean, timeoutMs: number, intervalMs = 10): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for condition");
}

async function waitForWsMessage(socket: WebSocket): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for WS message"));
    }, 1000);

    socket.once("message", (data: WebSocket.RawData) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(data.toString()) as RpcResponse);
      } catch (error) {
        reject(error);
      }
    });
  });
}

const runningServers: Array<StartedServer> = [];

afterEach(async () => {
  while (runningServers.length > 0) {
    const next = runningServers.pop();
    if (next) {
      await next.close();
    }
  }
});

describe("SSE /events", () => {
  it("streams ordered events, heartbeat, and supports Last-Event-ID replay", async () => {
    const hub = createSseHub({
      heartbeatMs: 25,
      historySize: 16
    });

    const server = await startServer({ eventsHub: hub });
    runningServers.push(server);

    const firstCollector = collectFrames(`${server.origin}/events`, 8);

    await waitFor(() => hub.getClientCount() > 0, 1_000);
    const sent1 = hub.publish({
      event: "status",
      data: {
        type: "status",
        ts: new Date().toISOString(),
        payload: { phase: "one" }
      }
    });
    const sent2 = hub.publish({
      event: "result",
      data: {
        type: "result",
        ts: new Date().toISOString(),
        payload: { value: 42 }
      }
    });

    const initialFrames = await firstCollector;
    const appFrames = initialFrames.filter((frame) => frame.event === "status" || frame.event === "result");

    expect(appFrames.length).toBeGreaterThanOrEqual(2);
    expect(appFrames[0].id).toBe(sent1.id);
    expect(appFrames[1].id).toBe(sent2.id);

    const secondCollector = collectFrames(
      `${server.origin}/events`,
      2,
      {
        headers: {
          "Last-Event-ID": sent1.id
        }
      }
    );

    const replayFrames = await secondCollector;
    const replayAppFrames = replayFrames.filter((frame) => frame.event === "status" || frame.event === "result");

    expect(replayAppFrames[0].id).toBe(sent2.id);
    expect(replayAppFrames[0].data).toBeDefined();
    const parsed = JSON.parse(replayAppFrames[0].data ?? "{}") as SseEnvelope["data"];
    expect(parsed.type).toBe("result");
  });

  it("connectSse consumes server events and forwards parsed data", async () => {
    const hub = createSseHub({
      heartbeatMs: 50,
      historySize: 8
    });
    const server = await startServer({ eventsHub: hub });
    runningServers.push(server);

    const received: SseEnvelope[] = [];
    const errors: unknown[] = [];
    const disconnect = connectSse({
      url: `${server.origin}/events`,
      onEvent: (event) => {
        received.push(event);
      },
      onError: (error) => {
        errors.push(error);
      }
    });

    await waitFor(() => hub.getClientCount() > 0, 1_000);
    hub.publish({
      event: "log",
      data: {
        type: "log",
        ts: new Date().toISOString(),
        payload: { message: "hello" }
      }
    });

    const deadline = Date.now() + 1000;
    while (received.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    disconnect();

    expect(errors).toHaveLength(0);
    expect(received.length).toBeGreaterThan(0);
    expect(received.some((event) => event.data.type === "log")).toBe(true);
  });
});

describe("WS /rpc", () => {
  function createDispatcher(): ActionDispatcher {
    let flakyAttempts = 0;

    return {
      async dispatch(action, tabId, params, signal) {
        if (action === "ping") {
          return {
            pong: true,
            tabId,
            echo: params
          };
        }

        if (action === "slow") {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 20);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new Error("aborted"));
            });
          });
          return {
            done: true
          };
        }

        if (action === "never") {
          await new Promise<void>((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              reject(new Error("aborted"));
            });
          });
          return {
            unreachable: true
          };
        }

        if (action === "flaky") {
          flakyAttempts += 1;
          if (flakyAttempts < 3) {
            const retryableError = new Error("transient failure") as Error & {
              code?: string;
              retryable?: boolean;
            };
            retryableError.code = "STALE_REF";
            retryableError.retryable = true;
            throw retryableError;
          }

          return {
            attempts: flakyAttempts
          };
        }

        if (action === "wait-navigation") {
          return {
            queued: true,
            tabId,
            echo: params
          };
        }

        const err = new Error(`Unknown action: ${action}`) as Error & {
          code?: string;
          retryable?: boolean;
        };
        err.code = "UNKNOWN_ACTION";
        err.retryable = false;
        throw err;
      },
      getReliabilityHooks(action) {
        if (action === "wait-navigation") {
          return {
            waitFor: async () => [
              {
                kind: "navigation",
                expected_url: "https://example.com/complete"
              }
            ],
            waitForNavigation: async () => false
          };
        }

        return undefined;
      }
    };
  }

  it("applies retry ladder and wait-timeout exhaustion semantics", async () => {
    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createDispatcher(),
      requestTimeoutMs: 1_000,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"],
      reliabilityPolicy: {
        max_attempts: 3,
        wait_timeout_ms: 30,
        selector_poll_ms: 10,
        network_idle_quiet_ms: 20
      }
    });

    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });

    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-flaky",
        action: "flaky",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );

    const flakyResponse = await waitForWsMessage(socket);
    expect(flakyResponse).toMatchObject({
      request_id: "req-flaky",
      ok: true,
      result: {
        attempts: 3
      }
    });

    socket.send(
      JSON.stringify({
        request_id: "req-wait",
        action: "wait-navigation",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );

    const waitResponse = await waitForWsMessage(socket);
    expect(waitResponse).toMatchObject({
      request_id: "req-wait",
      ok: false,
      error: {
        code: "WAIT_TIMEOUT_EXHAUSTED"
      },
      retryable: false
    });

    socket.close();
    await once(socket, "close");
  });

  it("supports RPC success, validation errors, duplicate in-flight IDs, and timeout", async () => {
    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createDispatcher(),
      requestTimeoutMs: 60,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"]
    });
    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });

    await once(socket, "open");

    const pingReq: RpcRequest = {
      request_id: "req-ping",
      action: "ping",
      tab_id: "tab-1",
      params: {
        a: 1
      }
    };
    socket.send(JSON.stringify(pingReq));
    const pingRes = await waitForWsMessage(socket);
    expect(pingRes).toMatchObject({
      request_id: "req-ping",
      ok: true
    });

    socket.send("{invalid");
    const invalidJson = await waitForWsMessage(socket);
    expect(invalidJson).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_JSON"
      },
      retryable: false
    });

    socket.send(
      JSON.stringify({
        request_id: "req-unknown",
        action: "unknown",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );
    const unknownRes = await waitForWsMessage(socket);
    expect(unknownRes).toMatchObject({
      request_id: "req-unknown",
      ok: false,
      error: {
        code: "UNKNOWN_ACTION"
      },
      retryable: false
    });

    const slowRequest: RpcRequest = {
      request_id: "req-dup",
      action: "slow",
      tab_id: "tab-1",
      params: {}
    };
    socket.send(JSON.stringify(slowRequest));
    socket.send(JSON.stringify(slowRequest));

    const duplicateResponses = [await waitForWsMessage(socket), await waitForWsMessage(socket)];
    expect(duplicateResponses.some((response) => !response.ok && response.error.code === "DUPLICATE_REQUEST_ID")).toBe(true);
    expect(duplicateResponses.some((response) => response.ok && response.request_id === "req-dup")).toBe(true);

    socket.send(
      JSON.stringify({
        request_id: "req-timeout",
        action: "never",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );

    const timeoutRes = await waitForWsMessage(socket);
    expect(timeoutRes).toMatchObject({
      request_id: "req-timeout",
      ok: false,
      error: {
        code: "REQUEST_TIMEOUT"
      },
      retryable: true
    });

    socket.close();
    await once(socket, "close");
  });

  it("returns rate-limit errors with the originating request_id", async () => {
    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createDispatcher(),
      requestTimeoutMs: 200,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"],
      rateLimitWindowMs: 5_000,
      rateLimitMaxMessages: 0
    });
    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });
    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-rate-1",
        action: "ping",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );

    const response = await waitForWsMessage(socket);
    expect(response).toMatchObject({
      request_id: "req-rate-1",
      ok: false,
      error: {
        code: "RATE_LIMITED"
      },
      retryable: true
    });

    socket.close();
    await once(socket, "close");
  });

  it("returns structured retryability for Task4 validation and navigation/frame failures", async () => {
    const runtime: BrowserActionRuntime = {
      async send<T>(method: string, params?: object) {
        if (method === "Page.navigate") {
          const url = (params as { url?: string } | undefined)?.url;
          if (url === "https://bad-domain.invalid") {
            throw {
              code: "NAVIGATION_FAILED",
              message: "Navigation failed: net::ERR_NAME_NOT_RESOLVED",
              retryable: false
            };
          }

          return {
            frameId: "root"
          } as T;
        }

        if (method === "DOM.resolveNode") {
          const backendNodeId = (params as { backendNodeId?: number })?.backendNodeId;
          if (backendNodeId === 999) {
            throw new Error("No node with given id");
          }
          return { object: { objectId: "obj-1" } } as T;
        }

        if (method === "Runtime.callFunctionOn") {
          return { result: { value: true } } as T;
        }

        return {} as T;
      },
      route() {
        return {
          sessionId: "session-main",
          frameId: "root"
        };
      },
      routeByFrameOrdinal(_tabId, frameOrdinal) {
        if (frameOrdinal === 2) {
          return {
            sessionId: "session-child",
            frameId: "child-frame"
          };
        }

        throw {
          code: "FRAME_NOT_FOUND",
          message: `Frame ordinal ${frameOrdinal} not found`,
          retryable: false
        };
      },
      getTab(tabId) {
        return {
          tabId,
          targetId: `target-${tabId}`,
          sessionId: "session-main",
          status: "attached",
          attachedAt: "2026-02-27T00:00:00.000Z"
        };
      },
      listTabs() {
        return [
          {
            tabId: "tab-1",
            targetId: "target-tab-1",
            sessionId: "session-main",
            status: "attached",
            attachedAt: "2026-02-27T00:00:00.000Z"
          }
        ];
      }
    };

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createBrowserActionDispatcher({ runtime }),
      requestTimeoutMs: 500,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });

    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-invalid",
        action: "Navigate",
        tab_id: "tab-1",
        params: {
          mode: "to"
        }
      } satisfies RpcRequest)
    );
    const invalidResponse = await waitForWsMessage(socket);
    expect(invalidResponse).toMatchObject({
      request_id: "req-invalid",
      ok: false,
      error: {
        code: "INVALID_REQUEST"
      },
      retryable: false
    });

    socket.send(
      JSON.stringify({
        request_id: "req-stale",
        action: "FormInput",
        tab_id: "tab-1",
        params: {
          fields: [
            {
              ref: "f0:999",
              kind: "text",
              value: "abc"
            }
          ]
        }
      } satisfies RpcRequest)
    );
    const staleResponse = await waitForWsMessage(socket);
    expect(staleResponse).toMatchObject({
      request_id: "req-stale",
      ok: false,
      error: {
        code: "STALE_REF_EXHAUSTED"
      },
      retryable: false
    });

    socket.send(
      JSON.stringify({
        request_id: "req-nav-fail",
        action: "Navigate",
        tab_id: "tab-1",
        params: {
          mode: "to",
          url: "https://bad-domain.invalid"
        }
      } satisfies RpcRequest)
    );
    const navigationFailed = await waitForWsMessage(socket);
    expect(navigationFailed).toMatchObject({
      request_id: "req-nav-fail",
      ok: false,
      error: {
        code: "NAVIGATION_FAILED"
      },
      retryable: false
    });

    socket.send(
      JSON.stringify({
        request_id: "req-frame-miss",
        action: "FormInput",
        tab_id: "tab-1",
        params: {
          fields: [
            {
              ref: "f9:101",
              kind: "text",
              value: "abc"
            }
          ]
        }
      } satisfies RpcRequest)
    );
    const frameMissing = await waitForWsMessage(socket);
    expect(frameMissing).toMatchObject({
      request_id: "req-frame-miss",
      ok: false,
      error: {
        code: "FRAME_NOT_FOUND"
      },
      retryable: false
    });

    socket.close();
    await once(socket, "close");
  });

  it("preserves dispatcher retryability for REQUEST_ABORTED", async () => {
    const dispatcher: ActionDispatcher = {
      supports(action) {
        return action === "abort-now";
      },
      async dispatch() {
        const error = new Error("Aborted by caller") as Error & {
          code?: string;
          retryable?: boolean;
        };
        error.code = "REQUEST_ABORTED";
        error.retryable = true;
        throw error;
      }
    };

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher,
      requestTimeoutMs: 200,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"]
    });
    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });
    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-abort",
        action: "abort-now",
        tab_id: "tab-1",
        params: {}
      } satisfies RpcRequest)
    );

    const aborted = await waitForWsMessage(socket);
    expect(aborted).toMatchObject({
      request_id: "req-abort",
      ok: false,
      error: {
        code: "REQUEST_ABORTED"
      },
      retryable: true
    });

    socket.close();
    await once(socket, "close");
  });

  it("terminates dead clients during heartbeat when pong is missing", async () => {
    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createDispatcher(),
      requestTimeoutMs: 100,
      heartbeatMs: 30,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      autoPong: false,
      headers: {
        origin: "http://127.0.0.1"
      }
    });

    await once(socket, "open");
    await once(socket, "close");
    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it("createWsRpcClient performs request/response calls", async () => {
    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createDispatcher(),
      requestTimeoutMs: 200,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startServer({ rpcServer });
    runningServers.push(server);

    const client = createWsRpcClient({
      url: server.origin.replace("http", "ws") + "/rpc",
      timeoutMs: 500,
      webSocketFactory: (url) =>
        new WebSocket(url, {
          headers: {
            origin: "http://127.0.0.1"
          }
        })
    });

    const result = await client.call("ping", "tab-x", {
      hello: "world"
    });
    expect(result).toMatchObject({
      pong: true,
      tabId: "tab-x",
      echo: {
        hello: "world"
      }
    });

    await client.close();
  });
});
