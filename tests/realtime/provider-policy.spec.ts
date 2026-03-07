import { describe, expect, it } from "vitest";

import {
  assertDirectWebSocketAllowed,
  resolveRealtimePolicy
} from "../../shared/src/realtime/provider-policy";
import { createWsRpcClient } from "../../web/src/lib/realtime/wsRpcClient";

describe("realtime provider policy", () => {
  it("allows direct websocket in local mode", () => {
    const policy = resolveRealtimePolicy("local");

    expect(policy).toMatchObject({
      mode: "local",
      allowsSse: true,
      allowsDirectWebSocket: true
    });
    expect(policy.recommendedHostedProviders).toHaveLength(0);
    expect(() => {
      assertDirectWebSocketAllowed("local", "ws://localhost:3001/rpc");
    }).not.toThrow();
  });

  it("requires hosted websocket provider in vercel mode", () => {
    const policy = resolveRealtimePolicy("vercel");

    expect(policy).toMatchObject({
      mode: "vercel",
      allowsSse: true,
      allowsDirectWebSocket: false
    });
    expect(policy.recommendedHostedProviders.length).toBeGreaterThan(0);
    expect(policy.recommendedHostedProviders).toContain("Ably");
    expect(policy.recommendedHostedProviders).toContain("PartyKit");

    let thrown: unknown;
    try {
      assertDirectWebSocketAllowed("vercel", "wss://example.com/rpc");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "WS_PROVIDER_REQUIRED",
      retryable: false
    });
  });
});

describe("ws rpc client policy guard", () => {
  it("throws deterministic policy error for direct websocket mode on vercel", () => {
    let thrown: unknown;
    try {
      createWsRpcClient({
        url: "wss://example.com/rpc",
        deploymentMode: "vercel",
        webSocketMode: "direct"
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "WS_PROVIDER_REQUIRED",
      retryable: false
    });
  });

  it("allows hosted provider mode on vercel", async () => {
    const client = createWsRpcClient({
      url: "wss://ably-realtime.example/rpc",
      deploymentMode: "vercel",
      webSocketMode: "hosted_provider"
    });

    await expect(client.close()).resolves.toBeUndefined();
  });
});
