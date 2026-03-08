import { createServer } from "node:http";
import { once } from "node:events";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import { createBlockedDomainsGuard, type ActionDispatcher } from "../../sidecar/src/rpc/dispatcher";
import { createRpcWebSocketServer } from "../../sidecar/src/ws/rpcServer";
import type { RpcRequest, RpcResponse } from "../../shared/src/transport";

interface StartedServer {
  origin: string;
  close: () => Promise<void>;
}

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

const runningServers: StartedServer[] = [];

afterEach(async () => {
  while (runningServers.length > 0) {
    const next = runningServers.pop();
    if (next) {
      await next.close();
    }
  }
});

describe("Task7 UI/UX E2E validation", () => {
  it("returns deterministic blocked-domain errors for blocked Navigate URLs and succeeds for allowed URLs", async () => {
    const baseDispatcher: ActionDispatcher = {
      supports(action) {
        return action === "Navigate";
      },
      async dispatch(_action, _tabId, params) {
        return {
          navigated_to: params.url ?? null
        };
      }
    };

    const guardedDispatcher = createBlockedDomainsGuard(baseDispatcher, {
      policy: {
        blocklist: ["*"],
        allowlist: ["example.com"]
      }
    });

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: guardedDispatcher,
      requestTimeoutMs: 500,
      heartbeatMs: 10_000,
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
        request_id: "req-blocked",
        action: "Navigate",
        tab_id: "tab-1",
        params: {
          mode: "to",
          url: "https://blocked.example/path"
        }
      } satisfies RpcRequest)
    );
    const blocked = await waitForWsMessage(socket);
    expect(blocked).toMatchObject({
      request_id: "req-blocked",
      ok: false,
      error: {
        code: "BLOCKED_DOMAIN"
      },
      retryable: false
    });
    if (!blocked.ok) {
      expect(blocked.error.details).toMatchObject({
        normalized_url: "https://blocked.example/path",
        hostname: "blocked.example",
        matched_rule: "*",
        matched_list: "blocklist"
      });
    }

    socket.send(
      JSON.stringify({
        request_id: "req-allowed",
        action: "Navigate",
        tab_id: "tab-1",
        params: {
          mode: "to",
          url: "https://example.com/allowed"
        }
      } satisfies RpcRequest)
    );
    const allowed = await waitForWsMessage(socket);
    expect(allowed).toMatchObject({
      request_id: "req-allowed",
      ok: true,
      result: {
        navigated_to: "https://example.com/allowed"
      }
    });

    socket.close();
    await once(socket, "close");
  });
});
