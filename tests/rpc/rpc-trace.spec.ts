import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { createTraceLogger } from "../../sidecar/src/observability/trace-logger";
import { createPingDispatcher } from "../../sidecar/src/rpc/dispatcher";
import { createRpcWebSocketServer } from "../../sidecar/src/ws/rpcServer";
import type { RpcResponse } from "../../shared/src/transport";

interface StartedServer {
  origin: string;
  close: () => Promise<void>;
}

interface TraceLine {
  event: string;
  request_id?: string;
  action?: string;
  params?: Record<string, unknown>;
}

const runningServers: StartedServer[] = [];

async function startServer(rpcServer: ReturnType<typeof createRpcWebSocketServer>): Promise<StartedServer> {
  const server = createServer((_, response) => {
    response.statusCode = 404;
    response.end();
  });

  server.on("upgrade", rpcServer.handleUpgrade);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start server");
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

async function waitForWsMessage(socket: WebSocket): Promise<RpcResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for WS message"));
    }, 1_000);

    socket.once("message", (data: WebSocket.RawData) => {
      clearTimeout(timeout);
      resolve(JSON.parse(data.toString()) as RpcResponse);
    });
  });
}

function parseJsonl(raw: string): TraceLine[] {
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TraceLine);
}

afterEach(async () => {
  while (runningServers.length > 0) {
    const next = runningServers.pop();
    if (next) {
      await next.close();
    }
  }
});

describe("rpc tracing", () => {
  it("logs request and response events with correlation ids", async () => {
    const traceRoot = await mkdtemp(join(tmpdir(), "task8-rpc-trace-"));
    const traceLogger = createTraceLogger({
      rootDir: traceRoot,
      backendUuid: "backend-fixed",
      runId: "run-fixed"
    });

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createPingDispatcher(),
      requestTimeoutMs: 500,
      traceLogger,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startServer(rpcServer);
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });
    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-1",
        action: "ping",
        tab_id: "tab-1",
        params: {
          hello: "world"
        }
      })
    );

    const response = await waitForWsMessage(socket);
    expect(response).toMatchObject({
      request_id: "req-1",
      ok: true
    });

    socket.close();
    await once(socket, "close");
    await traceLogger.flush();

    const lines = parseJsonl(await readFile(traceLogger.traceFilePath, "utf8"));
    expect(lines.some((line) => line.event === "rpc.request" && line.request_id === "req-1" && line.action === "ping")).toBe(true);
    expect(lines.some((line) => line.event === "rpc.response" && line.request_id === "req-1" && line.action === "ping")).toBe(true);
  });

  it("awaits timeout trace write before returning REQUEST_TIMEOUT response", async () => {
    let timeoutTraceResolvedAt = 0;

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      requestTimeoutMs: 20,
      allowedOrigins: ["http://127.0.0.1"],
      dispatcher: {
        supports(action) {
          return action === "ping";
        },
        async dispatch() {
          return await new Promise<never>(() => {
            return;
          });
        }
      },
      traceLogger: {
        backendUuid: "backend-fixed",
        runId: "run-fixed",
        traceFilePath: "/tmp/unused.jsonl",
        async log(input) {
          const error = input.error as { code?: unknown } | undefined;
          if (input.event === "rpc.error" && error?.code === "REQUEST_TIMEOUT") {
            await new Promise((resolve) => setTimeout(resolve, 60));
            timeoutTraceResolvedAt = Date.now();
          }
        },
        async writeArtifact() {
          return "/tmp/unused-artifact";
        },
        async flush() {
          return;
        }
      }
    });

    const server = await startServer(rpcServer);
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });
    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-timeout",
        action: "ping",
        tab_id: "tab-1",
        params: {}
      })
    );

    const response = await waitForWsMessage(socket);
    const responseAt = Date.now();
    expect(response).toMatchObject({
      request_id: "req-timeout",
      ok: false,
      error: {
        code: "REQUEST_TIMEOUT"
      },
      retryable: true
    });
    expect(timeoutTraceResolvedAt).toBeGreaterThan(0);
    expect(responseAt).toBeGreaterThanOrEqual(timeoutTraceResolvedAt);

    socket.close();
    await once(socket, "close");
  });

  it("redacts sensitive fields in traced params", async () => {
    const traceRoot = await mkdtemp(join(tmpdir(), "task8-rpc-trace-redaction-"));
    const traceLogger = createTraceLogger({
      rootDir: traceRoot,
      backendUuid: "backend-fixed",
      runId: "run-redaction"
    });

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: createPingDispatcher(),
      requestTimeoutMs: 500,
      traceLogger,
      allowedOrigins: ["http://127.0.0.1"]
    });

    const server = await startServer(rpcServer);
    runningServers.push(server);

    const socket = new WebSocket(server.origin.replace("http", "ws") + "/rpc", {
      headers: {
        origin: "http://127.0.0.1"
      }
    });
    await once(socket, "open");

    socket.send(
      JSON.stringify({
        request_id: "req-redact",
        action: "ping",
        tab_id: "tab-1",
        params: {
          api_key: "sk-secret",
          authorization: "Bearer top-secret",
          nested: {
            x_api_key: "nested-secret"
          }
        }
      })
    );

    await waitForWsMessage(socket);
    socket.close();
    await once(socket, "close");
    await traceLogger.flush();

    const lines = parseJsonl(await readFile(traceLogger.traceFilePath, "utf8"));
    const requestLine = lines.find((line) => line.event === "rpc.request" && line.request_id === "req-redact");
    expect(requestLine?.params).toMatchObject({
      api_key: "[REDACTED]",
      authorization: "[REDACTED]",
      nested: {
        x_api_key: "[REDACTED]"
      }
    });
  });
});
