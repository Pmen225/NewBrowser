import { describe, expect, it } from "vitest";

import { isMissingSessionError, withRecoveredSession } from "../../scripts/live-cdp-panel-check.mjs";

describe("live CDP panel helper", () => {
  it("detects missing-session errors", () => {
    expect(isMissingSessionError(new Error("[Runtime.evaluate] Session with given id not found"))).toBe(true);
    expect(isMissingSessionError(new Error("other failure"))).toBe(false);
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
});
