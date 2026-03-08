import { afterEach, describe, expect, it, vi } from "vitest";

import { createPanelRpcClient } from "../../extension/lib/rpc.js";

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  url: string | undefined;
  listeners = new Map<string, Array<(event?: any) => void>>();

  constructor(url: string | undefined) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: any) => void) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  send() {}

  close() {}
}

describe("panel rpc client websocket url resolution", () => {
  afterEach(() => {
    MockWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("uses the wsUrl option when connecting", () => {
    vi.stubGlobal("WebSocket", MockWebSocket);

    const rpc = createPanelRpcClient({
      wsUrl: "ws://127.0.0.1:3210/rpc"
    });

    rpc.connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://127.0.0.1:3210/rpc");
  });

  it("falls back to the legacy url option when wsUrl is absent", () => {
    vi.stubGlobal("WebSocket", MockWebSocket);

    const rpc = createPanelRpcClient({
      url: "ws://127.0.0.1:3210/rpc"
    });

    rpc.connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe("ws://127.0.0.1:3210/rpc");
  });

  it("throws a clear error when neither wsUrl nor url is provided", () => {
    vi.stubGlobal("WebSocket", MockWebSocket);

    const rpc = createPanelRpcClient({});

    expect(() => rpc.connect()).toThrowError("RPC WebSocket URL is required");
    expect(MockWebSocket.instances).toHaveLength(0);
  });
});
