import { describe, expect, it } from "vitest";

import { resolveLiveCdpWsUrl } from "../../scripts/lib/live-cdp-config.js";

describe("live CDP config", () => {
  it("prefers the current /json/version websocket over a stale explicit websocket url", async () => {
    const resolved = await resolveLiveCdpWsUrl({
      explicitWsUrl: "ws://127.0.0.1:9555/devtools/browser/stale-browser-id",
      host: "127.0.0.1",
      port: 9555,
      portCandidates: [9555],
      fetchImpl: async () => ({
        ok: true,
        async json() {
          return {
            webSocketDebuggerUrl: "ws://127.0.0.1:9555/devtools/browser/fresh-browser-id"
          };
        }
      }),
      resolveRunningChromeWsUrlImpl: async () => "ws://127.0.0.1:9555/devtools/browser/profile-browser-id"
    });

    expect(resolved).toBe("ws://127.0.0.1:9555/devtools/browser/fresh-browser-id");
  });

  it("falls back to the explicit websocket when direct discovery is unavailable", async () => {
    const resolved = await resolveLiveCdpWsUrl({
      explicitWsUrl: "ws://127.0.0.1:9555/devtools/browser/explicit-browser-id",
      host: "127.0.0.1",
      port: 9555,
      portCandidates: [9555],
      fetchImpl: async () => {
        throw new Error("connection refused");
      },
      resolveRunningChromeWsUrlImpl: async () => "ws://127.0.0.1:9555/devtools/browser/profile-browser-id"
    });

    expect(resolved).toBe("ws://127.0.0.1:9555/devtools/browser/explicit-browser-id");
  });
});
