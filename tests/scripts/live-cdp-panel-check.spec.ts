import { describe, expect, it } from "vitest";

import { isMissingSessionError, isMissingTargetError, withRecoveredSession } from "../../scripts/live-cdp-panel-check.mjs";

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
});
