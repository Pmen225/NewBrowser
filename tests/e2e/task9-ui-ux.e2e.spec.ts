import { createServer } from "node:http";
import { once } from "node:events";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import {
  createBlockedDomainsGuard,
  createSafetyPermissionGuard,
  type ActionDispatcher
} from "../../sidecar/src/rpc/dispatcher";
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

describe("Task9 UI/UX E2E validation", () => {
  it("requires confirmation for irreversible intents and proceeds after approval", async () => {
    const baseDispatcher: ActionDispatcher = {
      supports(action) {
        return action === "Navigate" || action === "ComputerBatch";
      },
      async dispatch(action, tabId, params) {
        return {
          executed: true,
          action,
          tab_id: tabId,
          echo: params
        };
      }
    };

    const safetyGuarded = createSafetyPermissionGuard(baseDispatcher);
    const blockedThenSafety = createBlockedDomainsGuard(safetyGuarded, {
      policy: {
        blocklist: ["*"],
        allowlist: ["example.com"]
      }
    });

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher: blockedThenSafety,
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
        request_id: "req-confirm",
        action: "ComputerBatch",
        tab_id: "tab-1",
        params: {
          intent: "submit"
        }
      } satisfies RpcRequest)
    );

    const confirmation = await waitForWsMessage(socket);
    expect(confirmation).toMatchObject({
      request_id: "req-confirm",
      ok: false,
      error: {
        code: "CONFIRMATION_REQUIRED"
      },
      retryable: false
    });
    if (!confirmation.ok) {
      expect(confirmation.error.details).toMatchObject({
        required_confirmation: true,
        confirm_before: true,
        irreversible_action: "submit",
        action: "ComputerBatch",
        tab_id: "tab-1",
        confirmation_token: expect.any(String)
      });
    }
    const confirmationToken =
      !confirmation.ok && typeof confirmation.error.details?.confirmation_token === "string"
        ? confirmation.error.details.confirmation_token
        : null;
    expect(typeof confirmationToken).toBe("string");

    socket.send(
      JSON.stringify({
        request_id: "req-bypass",
        action: "ComputerBatch",
        tab_id: "tab-1",
        params: {
          intent: "submit",
          confirmed: true
        }
      } satisfies RpcRequest)
    );

    const bypass = await waitForWsMessage(socket);
    expect(bypass).toMatchObject({
      request_id: "req-bypass",
      ok: false,
      error: {
        code: "CONFIRMATION_REQUIRED"
      },
      retryable: false
    });

    socket.send(
      JSON.stringify({
        request_id: "req-approved",
        action: "ComputerBatch",
        tab_id: "tab-1",
        params: {
          intent: "submit",
          confirmed: true,
          confirmation_token: confirmationToken
        }
      } satisfies RpcRequest)
    );

    const approved = await waitForWsMessage(socket);
    expect(approved).toMatchObject({
      request_id: "req-approved",
      ok: true,
      result: {
        executed: true,
        action: "ComputerBatch",
        tab_id: "tab-1"
      }
    });

    socket.send(
      JSON.stringify({
        request_id: "req-normal",
        action: "ComputerBatch",
        tab_id: "tab-1",
        params: {
          intent: "read"
        }
      } satisfies RpcRequest)
    );

    const normal = await waitForWsMessage(socket);
    expect(normal).toMatchObject({
      request_id: "req-normal",
      ok: true
    });

    socket.send(
      JSON.stringify({
        request_id: "req-blocked",
        action: "Navigate",
        tab_id: "tab-1",
        params: {
          mode: "to",
          url: "https://blocked.example/path",
          intent: "purchase"
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

    socket.close();
    await once(socket, "close");
  });
});
