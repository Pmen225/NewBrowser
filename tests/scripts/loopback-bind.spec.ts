import { describe, expect, it, vi } from "vitest";

import {
  assertLoopbackBindReady,
  classifyLoopbackBindFailure,
  listenWithLoopbackGuard
} from "../../scripts/lib/loopback-bind.js";

describe("loopback bind guard", () => {
  it("classifies EPERM as permission failure", () => {
    const verdict = classifyLoopbackBindFailure(Object.assign(new Error("operation not permitted"), { code: "EPERM" }));
    expect(verdict.classification).toBe("loopback_bind_permission_failure");
  });

  it("classifies EADDRINUSE as port-in-use failure", () => {
    const verdict = classifyLoopbackBindFailure(Object.assign(new Error("address in use"), { code: "EADDRINUSE" }));
    expect(verdict.classification).toBe("loopback_bind_port_in_use");
  });

  it("wraps listen errors with deterministic classification", async () => {
    const server = {
      once: vi.fn(),
      off: vi.fn(),
      listen: vi.fn((_port: number, _host: string, _cb: () => void) => {
        throw Object.assign(new Error("operation not permitted"), { code: "EPERM" });
      })
    } as any;

    await expect(listenWithLoopbackGuard(server, { host: "127.0.0.1", port: 0, label: "fixture server" })).rejects.toThrow(
      /loopback_bind_permission_failure/
    );
  });

  it("supports preflight readiness checks with injected server factory", async () => {
    const server = {
      once: vi.fn(),
      off: vi.fn(),
      listen: vi.fn((_port: number, _host: string, cb: () => void) => cb()),
      close: vi.fn((cb: () => void) => cb())
    } as any;

    const createServerImpl = vi.fn(() => server);

    await expect(assertLoopbackBindReady({ createServerImpl })).resolves.toBeUndefined();
    expect(createServerImpl).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
