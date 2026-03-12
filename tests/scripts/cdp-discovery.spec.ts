import { describe, expect, it, vi } from "vitest";

import {
  fetchCdpWebSocketUrl,
  isProcessInspectionPermissionFailure,
  resolveRunningChromeCdpWsUrl
} from "../../scripts/lib/cdp-discovery.js";

describe("cdp discovery", () => {
  it("prefers direct candidate ports before process inspection", async () => {
    const execFileImpl = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === "http://127.0.0.1:9555/json/version") {
        return {
          ok: true,
          async json() {
            return { webSocketDebuggerUrl: "ws://127.0.0.1:9555/devtools/browser/live" };
          }
        };
      }
      return {
        ok: false,
        async json() {
          return {};
        }
      };
    });

    const wsUrl = await resolveRunningChromeCdpWsUrl({
      host: "127.0.0.1",
      portCandidates: [9555, 9222],
      fetchImpl,
      execFileImpl
    });

    expect(wsUrl).toBe("ws://127.0.0.1:9555/devtools/browser/live");
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  it("falls back to process inspection when candidate ports are unreachable", async () => {
    const execFileImpl = vi.fn(async () => ({
      stdout: "Chromium --remote-debugging-port=9444 --user-data-dir=/tmp/profile about:blank\n",
      stderr: ""
    }));

    const fetchImpl = vi.fn(async (url: string) => {
      if (url === "http://127.0.0.1:9444/json/version") {
        return {
          ok: true,
          async json() {
            return { webSocketDebuggerUrl: "ws://127.0.0.1:9444/devtools/browser/from-ps" };
          }
        };
      }

      return {
        ok: false,
        async json() {
          return {};
        }
      };
    });

    const wsUrl = await resolveRunningChromeCdpWsUrl({
      host: "127.0.0.1",
      profileRoot: "/tmp/profile",
      portCandidates: [9555],
      fetchImpl,
      execFileImpl
    });

    expect(wsUrl).toBe("ws://127.0.0.1:9444/devtools/browser/from-ps");
    expect(execFileImpl).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when candidate fetch is not ok", async () => {
    const wsUrl = await fetchCdpWebSocketUrl({
      host: "127.0.0.1",
      port: 9555,
      fetchImpl: async () => ({
        ok: false,
        async json() {
          return {};
        }
      })
    });

    expect(wsUrl).toBeUndefined();
  });

  it("detects process inspection permission failures", () => {
    expect(isProcessInspectionPermissionFailure(Object.assign(new Error("spawn EPERM"), { code: "EPERM" }))).toBe(true);
    expect(isProcessInspectionPermissionFailure(new Error("other"))).toBe(false);
  });
});
