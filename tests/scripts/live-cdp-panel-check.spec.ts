import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isMissingSessionError,
  isMissingTargetError,
  resolveConfiguredExtensionId,
  withRecoveredSession
} from "../../scripts/live-cdp-panel-check.mjs";

describe("live CDP panel helper", () => {
  it("detects missing-session errors", () => {
    expect(isMissingSessionError(new Error("[Runtime.evaluate] Session with given id not found"))).toBe(true);
    expect(isMissingSessionError(new Error("other failure"))).toBe(false);
  });

  it("detects missing-target errors", () => {
    expect(isMissingTargetError(new Error("[Target.attachToTarget] No target with given id found"))).toBe(true);
    expect(isMissingTargetError(new Error("other failure"))).toBe(false);
  });

  it("reattaches to the same target when the original session is gone", async () => {
    const sendCalls = [];
    const cdp = {
      async send(method, params = {}, sessionId) {
        sendCalls.push({ method, params, sessionId });
        if (method === "Target.attachToTarget") {
          return { sessionId: "session-2" };
        }
        return {};
      }
    };
    const target = {
      targetId: "target-1",
      sessionId: "session-1"
    };
    let attempts = 0;

    const result = await withRecoveredSession(cdp, target, async (sessionId) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(`[Runtime.evaluate] Session with given id not found: ${sessionId}`);
      }
      return { sessionId };
    });

    expect(result).toEqual({ sessionId: "session-2" });
    expect(target.sessionId).toBe("session-2");
    expect(sendCalls).toEqual([
      {
        method: "Target.attachToTarget",
        params: { targetId: "target-1", flatten: true },
        sessionId: undefined
      },
      {
        method: "Page.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "DOM.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "Runtime.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "Network.enable",
        params: {},
        sessionId: "session-2"
      }
    ]);
  });

  it("re-resolves the target when the original target id is stale", async () => {
    const sendCalls = [];
    const cdp = {
      async send(method, params = {}, sessionId) {
        sendCalls.push({ method, params, sessionId });
        if (method === "Target.getTargets") {
          return {
            targetInfos: [
              {
                targetId: "target-2",
                type: "page",
                url: "https://the-internet.herokuapp.com/javascript_alerts"
              }
            ]
          };
        }
        if (method === "Target.attachToTarget") {
          if (params.targetId === "target-1") {
            throw new Error("[Target.attachToTarget] No target with given id found");
          }
          return { sessionId: "session-2" };
        }
        return {};
      }
    };
    const target = {
      targetId: "target-1",
      sessionId: "session-1",
      type: "page",
      matchUrl: "https://the-internet.herokuapp.com/javascript_alerts"
    };
    let attempts = 0;

    const result = await withRecoveredSession(cdp, target, async (sessionId) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(`[Runtime.evaluate] Session with given id not found: ${sessionId}`);
      }
      return { sessionId, targetId: target.targetId };
    });

    expect(result).toEqual({ sessionId: "session-2", targetId: "target-2" });
    expect(target.sessionId).toBe("session-2");
    expect(target.targetId).toBe("target-2");
    expect(sendCalls).toContainEqual({
      method: "Target.getTargets",
      params: {},
      sessionId: undefined
    });
    expect(sendCalls).toContainEqual({
      method: "Target.attachToTarget",
      params: { targetId: "target-2", flatten: true },
      sessionId: undefined
    });
  });

  it("resolves the extension id by manifest signature when the loaded profile points at another checkout", () => {
    const sandbox = mkdirSync(path.join(tmpdir(), `live-cdp-panel-check-${Date.now()}`), { recursive: true });
    const currentRoot = path.join(sandbox, "current");
    const installedRoot = path.join(sandbox, "installed");
    const profileRoot = path.join(sandbox, "profile");
    mkdirSync(path.join(currentRoot, "extension"), { recursive: true });
    mkdirSync(path.join(installedRoot, "extension"), { recursive: true });
    mkdirSync(path.join(profileRoot, "Default"), { recursive: true });

    const manifest = {
      manifest_version: 3,
      name: "Assistant",
      version: "0.2.0",
      description: "BrowserOS assistant shell wired to the local sidecar"
    };
    writeFileSync(path.join(currentRoot, "extension", "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(installedRoot, "extension", "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(
      path.join(profileRoot, "Default", "Secure Preferences"),
      JSON.stringify({
        extensions: {
          settings: {
            "assistant-extension-id": {
              path: path.join(installedRoot, "extension")
            }
          }
        }
      }, null, 2)
    );

    expect(resolveConfiguredExtensionId({
      root: currentRoot,
      profileRoot
    })).toBe("assistant-extension-id");
  });
});
