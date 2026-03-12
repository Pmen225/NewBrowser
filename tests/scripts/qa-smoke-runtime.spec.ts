import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

type FakeResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

describe("qa smoke runtime readiness", () => {
  it("accepts healthy cdp payload with tabs and extension loaded", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");

    const result = runtime.assessSidecarHealthPayload({
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: [{ tab_id: "1", target_id: "a" }]
    });

    expect(result.ready).toBe(true);
    expect(result.reason).toBe("ready");
  });

  it("rejects ping_only mode as runtime-not-ready", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");

    const result = runtime.assessSidecarHealthPayload({
      ok: true,
      mode: "ping_only",
      extension_loaded: true,
      tabs: [{ tab_id: "1", target_id: "a" }]
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toBe("mode:ping_only");
  });

  it("rejects missing attached tabs", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");

    const result = runtime.assessSidecarHealthPayload({
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: []
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toBe("tabs:empty");
  });

  it("rejects extension_loaded=false", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");

    const result = runtime.assessSidecarHealthPayload({
      ok: true,
      mode: "cdp",
      extension_loaded: false,
      tabs: [{ tab_id: "1", target_id: "a" }]
    });

    expect(result.ready).toBe(false);
    expect(result.reason).toBe("extension:not_loaded");
  });

  it("recovers from temporary offline health failures before timeout", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");
    const fetchImpl = vi
      .fn<() => Promise<FakeResponse>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          mode: "cdp",
          extension_loaded: true,
          tabs: [{ tab_id: "1", target_id: "a" }]
        })
      });

    const payload = await runtime.waitForSidecarRuntimeReadiness({
      healthUrl: "http://127.0.0.1:3210/health",
      timeoutMs: 100,
      pollMs: 1,
      fetchImpl
    });

    expect(payload.mode).toBe("cdp");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("derives a health endpoint from the rpc websocket url", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");

    expect(runtime.deriveSidecarHealthUrl("ws://127.0.0.1:3210/rpc")).toBe("http://127.0.0.1:3210/health");
    expect(runtime.deriveSidecarHealthUrl("wss://example.com/custom/rpc?token=1")).toBe("https://example.com/health");
  });

  it("fails early when the managed sidecar exits before runtime is ready", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");
    const serverProcess = new EventEmitter();
    const fetchImpl = vi.fn<() => Promise<FakeResponse>>().mockRejectedValue(new Error("fetch failed"));

    setTimeout(() => {
      serverProcess.emit("exit", 1, null);
    }, 0);

    await expect(runtime.waitForManagedSidecarRuntimeReadiness({
      serverProcess,
      healthUrl: "http://127.0.0.1:3210/health",
      timeoutMs: 100,
      pollMs: 1,
      fetchImpl
    })).rejects.toThrow(/exited before it became runtime-ready/i);
  });

  it("times out when runtime never becomes ready", async () => {
    const runtime = await import("../../scripts/lib/qa-smoke-runtime.cjs");
    const fetchImpl = vi.fn<() => Promise<FakeResponse>>().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        mode: "ping_only",
        extension_loaded: false,
        tabs: []
      })
    });

    await expect(runtime.waitForSidecarRuntimeReadiness({
      healthUrl: "http://127.0.0.1:3210/health",
      timeoutMs: 5,
      pollMs: 1,
      fetchImpl
    })).rejects.toThrow(/did not become runtime-ready/i);
  });
});
