import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";

import type { BrowserActionRuntime } from "../../src/cdp/browser-actions";
import { FakeTransport } from "../cdp/helpers/fake-transport";
import { createTraceLogger } from "../../sidecar/src/observability/trace-logger";
import { createBrowserActionDispatcher } from "../../sidecar/src/rpc/browser-action-dispatcher";
import { createRpcWebSocketServer } from "../../sidecar/src/ws/rpcServer";
import type { RpcResponse } from "../../shared/src/transport";
import { parseJsonl } from "../helpers/jsonl";

interface StartedServer {
  origin: string;
  close: () => Promise<void>;
}

interface TraceLine {
  backend_uuid: string;
  run_id: string;
  request_id?: string;
  action?: string;
  event: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

const runningServers: StartedServer[] = [];

function createRuntime() {
  const transport = new FakeTransport();

  const runtime: BrowserActionRuntime = {
    send: transport.send.bind(transport),
    route() {
      return {
        sessionId: "session-main",
        frameId: "root"
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

  return {
    transport,
    runtime
  };
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

afterEach(async () => {
  while (runningServers.length > 0) {
    const next = runningServers.pop();
    if (next) {
      await next.close();
    }
  }
});

describe("Task8 UI/UX E2E validation", () => {
  it("records request, CDP calls, and screenshot artifacts with stable correlation ids", async () => {
    const traceRoot = await mkdtemp(join(tmpdir(), "task8-e2e-trace-"));
    const { runtime, transport } = createRuntime();
    const traceLogger = createTraceLogger({
      rootDir: traceRoot,
      backendUuid: "backend-fixed",
      runId: "run-fixed"
    });

    const dispatcher = createBrowserActionDispatcher({
      runtime,
      traceLogger
    });

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", { result: { value: true } });
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("png-binary").toString("base64")
    });

    const rpcServer = createRpcWebSocketServer({
      path: "/rpc",
      dispatcher,
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
        request_id: "req-click",
        action: "ComputerBatch",
        tab_id: "tab-1",
        params: {
          steps: [{ kind: "click", ref: "f0:101" }]
        }
      })
    );

    const response = await waitForWsMessage(socket);
    expect(response).toMatchObject({
      request_id: "req-click",
      ok: true,
      result: {
        completed_steps: 1
      }
    });

    socket.close();
    await once(socket, "close");
    await traceLogger.flush();

    const lines = parseJsonl(await readFile(traceLogger.traceFilePath, "utf8"));
    const requestLines = lines.filter((line) => line.request_id === "req-click");

    expect(requestLines.some((line) => line.event === "rpc.request" && line.action === "ComputerBatch")).toBe(true);
    expect(
      requestLines.some(
        (line) =>
          line.event === "cdp.call" &&
          line.action === "ComputerBatch" &&
          line.params?.method === "DOM.resolveNode"
      )
    ).toBe(true);

    const screenshotLine = requestLines.find((line) => line.event === "artifact.screenshot");
    expect(screenshotLine).toBeDefined();
    const screenshotPath = screenshotLine?.result?.artifact_path;
    expect(typeof screenshotPath).toBe("string");
    if (typeof screenshotPath === "string") {
      const screenshotStat = await stat(screenshotPath);
      expect(screenshotStat.size).toBeGreaterThan(0);
    }

    expect(new Set(requestLines.map((line) => line.backend_uuid))).toEqual(new Set(["backend-fixed"]));
    expect(new Set(requestLines.map((line) => line.run_id))).toEqual(new Set(["run-fixed"]));
  });
});
