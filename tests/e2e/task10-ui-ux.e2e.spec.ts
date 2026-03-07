import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { createSseHub } from "../../sidecar/src/http/events";
import type { ActionDispatcher } from "../../sidecar/src/rpc/dispatcher";
import { createRpcWebSocketServer } from "../../sidecar/src/ws/rpcServer";
import { type SseEnvelope } from "../../shared/src/transport";
import { connectSse } from "../../web/src/lib/realtime/sseClient";
import { createWsRpcClient } from "../../web/src/lib/realtime/wsRpcClient";

interface StartedServer {
  origin: string;
  close: () => Promise<void>;
}

const runningServers: StartedServer[] = [];

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start >= timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function startRpcServer(rpcServer: ReturnType<typeof createRpcWebSocketServer>): Promise<StartedServer> {
  const server = createServer((_, response) => {
    response.statusCode = 404;
    response.end();
  });

  server.on("upgrade", rpcServer.handleUpgrade);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start RPC server");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await rpcServer.close();
      server.close();
      await once(server, "close");
    }
  };
}

async function startSseServer(
  onRequest: (request: IncomingMessage, response: ServerResponse) => void
): Promise<StartedServer> {
  const server = createServer(onRequest);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start SSE server");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, "close");
    }
  };
}

afterEach(async () => {
  while (runningServers.length > 0) {
    const next = runningServers.pop();
    if (next) {
      await next.close();
    }
  }
});

describe("Task10 UI/UX E2E validation", () => {
  it("connects SSE in local and vercel modes and sends no-cache on vercel", async () => {
    const requestHeaders: IncomingMessage["headers"][] = [];
    const hub = createSseHub({
      heartbeatMs: 0
    });

    const server = await startSseServer((request, response) => {
      if ((request.url ?? "/").startsWith("/events")) {
        requestHeaders.push(request.headers);
        hub.handleRequest(request, response);
        hub.publish({
          event: "status",
          data: {
            type: "status",
            ts: new Date().toISOString(),
            payload: {
              ok: true
            }
          }
        });
        return;
      }

      response.statusCode = 404;
      response.end();
    });

    runningServers.push(server);

    const receivedLocal: SseEnvelope[] = [];
    const disconnectLocal = connectSse({
      url: `${server.origin}/events`,
      deploymentMode: "local",
      onEvent: (event) => {
        receivedLocal.push(event);
      }
    });

    await waitFor(() => receivedLocal.length > 0, 1_000);
    disconnectLocal();

    expect(requestHeaders[0]?.accept).toBe("text/event-stream");
    expect(requestHeaders[0]?.["cache-control"]).toBeUndefined();

    const receivedVercel: SseEnvelope[] = [];
    const disconnectVercel = connectSse({
      url: `${server.origin}/events`,
      deploymentMode: "vercel",
      onEvent: (event) => {
        receivedVercel.push(event);
      }
    });

    await waitFor(() => receivedVercel.length > 0, 1_000);
    disconnectVercel();

    expect(requestHeaders[1]?.accept).toBe("text/event-stream");
    expect(requestHeaders[1]?.["cache-control"]).toBe("no-cache");

    hub.close();
  });

  it("blocks direct websocket on vercel and allows local direct websocket", async () => {
    const dispatcher: ActionDispatcher = {
      supports(action) {
        return action === "ping";
      },
      async dispatch(_action, tabId, params) {
        return {
          pong: true,
          tabId,
          echo: params
        };
      }
    };

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher,
      requestTimeoutMs: 500,
      heartbeatMs: 10_000,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startRpcServer(rpcServer);
    runningServers.push(server);

    const localClient = createWsRpcClient({
      url: server.origin.replace("http", "ws") + "/rpc",
      deploymentMode: "local",
      webSocketMode: "direct",
      timeoutMs: 500,
      webSocketFactory: (url) =>
        new WebSocket(url, {
          headers: {
            origin: "http://127.0.0.1"
          }
        })
    });

    const result = await localClient.call("ping", "tab-1", {
      hello: "task10"
    });
    expect(result).toMatchObject({
      pong: true,
      tabId: "tab-1",
      echo: {
        hello: "task10"
      }
    });
    await localClient.close();

    let blocked: unknown;
    try {
      createWsRpcClient({
        url: "wss://example.com/rpc",
        deploymentMode: "vercel",
        webSocketMode: "direct"
      });
    } catch (error) {
      blocked = error;
    }

    expect(blocked).toMatchObject({
      code: "WS_PROVIDER_REQUIRED",
      retryable: false
    });

    const hostedProviderClient = createWsRpcClient({
      url: "wss://ably.example/rpc",
      deploymentMode: "vercel",
      webSocketMode: "hosted_provider"
    });
    await expect(hostedProviderClient.close()).resolves.toBeUndefined();
  });
});
