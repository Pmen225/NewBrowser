import { createServer } from "node:http";
import { once } from "node:events";

import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FakeTransport } from "../cdp/helpers/fake-transport";
import { createActiveTabDispatcher } from "../../sidecar/src/rpc/active-tab-dispatcher";
import { createComposedDispatcher, createPingDispatcher } from "../../sidecar/src/rpc/dispatcher";
import { createSystemDispatcher } from "../../sidecar/src/rpc/system-dispatcher";
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

function createSessionRegistry() {
  const tabs = new Map<string, { tabId: string; targetId: string; sessionId: string; status: "attached"; attachedAt: string }>();

  return {
    listTabs: () => [...tabs.values()],
    attachTab: vi.fn(async (targetId: string) => {
      const tab = {
        tabId: `tab-${tabs.size + 1}`,
        targetId,
        sessionId: `session-${tabs.size + 1}`,
        status: "attached" as const,
        attachedAt: new Date().toISOString()
      };
      tabs.set(tab.tabId, tab);
      return tab;
    }),
    enableDomains: vi.fn(async () => undefined),
    refreshFrameTree: vi.fn(async () => ({
      tabId: "tab-1",
      mainFrameId: "root",
      frameCount: 1,
      frames: [],
      refreshedAt: new Date().toISOString()
    }))
  };
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

describe("Task23/24 + BYOK UI/UX validation", () => {
  it("syncs active tab and serves runtime/provider actions over rpc", async () => {
    const transport = new FakeTransport();
    const sessionRegistry = createSessionRegistry();

    let activeTabId = "";

    const runtimeDispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "cdp",
        default_tab_id: "tab-1",
        active_tab_id: activeTabId || undefined,
        tabs: sessionRegistry.listTabs().map((tab) => ({
          tab_id: tab.tabId,
          target_id: tab.targetId
        })),
        browser_policy: "ungoogled_only",
        extension_loaded: true
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({
          provider: "openai" as const,
          models: ["gpt-4.1-mini", "gpt-4.1"],
          default_model: "gpt-4.1-mini"
        }))
      }
    });

    const activeTabDispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry,
      onActiveTabChanged: (tabId) => {
        activeTabId = tabId;
      }
    });

    const dispatcher = createComposedDispatcher([createPingDispatcher(), runtimeDispatcher, activeTabDispatcher]);

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher,
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

    transport.queueResponse("Target.getTargets", {
      targetInfos: [{ targetId: "target-abc", type: "page", url: "https://example.com", title: "Example" }]
    });

    socket.send(
      JSON.stringify({
        request_id: "set-active",
        action: "SetActiveTab",
        tab_id: "__system__",
        params: {
          chrome_tab_id: 12,
          target_id: "target-abc",
          url: "https://example.com"
        }
      } satisfies RpcRequest)
    );

    const setActiveResponse = await waitForWsMessage(socket);
    expect(setActiveResponse).toMatchObject({
      request_id: "set-active",
      ok: true,
      result: {
        status: "ok"
      }
    });

    socket.send(
      JSON.stringify({
        request_id: "runtime",
        action: "GetRuntimeState",
        tab_id: "__system__",
        params: {}
      } satisfies RpcRequest)
    );

    const runtimeResponse = await waitForWsMessage(socket);
    expect(runtimeResponse).toMatchObject({
      request_id: "runtime",
      ok: true,
      result: {
        mode: "cdp",
        active_tab_id: "tab-1",
        browser_policy: "ungoogled_only",
        extension_loaded: true
      }
    });

    socket.send(
      JSON.stringify({
        request_id: "provider-validate",
        action: "ProviderValidate",
        tab_id: "__system__",
        params: {
          provider: "openai",
          api_key: "sk-test"
        }
      } satisfies RpcRequest)
    );

    const providerValidateResponse = await waitForWsMessage(socket);
    expect(providerValidateResponse).toMatchObject({
      request_id: "provider-validate",
      ok: true,
      result: {
        provider: "openai",
        ok: true
      }
    });

    socket.send(
      JSON.stringify({
        request_id: "provider-models",
        action: "ProviderListModels",
        tab_id: "__system__",
        params: {
          provider: "openai",
          api_key: "sk-test"
        }
      } satisfies RpcRequest)
    );

    const providerModelsResponse = await waitForWsMessage(socket);
    expect(providerModelsResponse).toMatchObject({
      request_id: "provider-models",
      ok: true,
      result: {
        provider: "openai",
        models: ["gpt-4.1-mini", "gpt-4.1"],
        default_model: "gpt-4.1-mini"
      }
    });

    socket.close();
    await once(socket, "close");
  });
});
