import { describe, expect, it } from "vitest";

import type { BrowserActionRuntime } from "../../src/cdp/browser-actions";
import { createBrowserActionDispatcher } from "../../sidecar/src/rpc/browser-action-dispatcher";
import { FakeTransport } from "../cdp/helpers/fake-transport";

function createRuntime() {
  const transport = new FakeTransport();
  const routeByOrdinalCalls: number[] = [];

  const runtime: BrowserActionRuntime = {
    send: transport.send.bind(transport),
    route() {
      return {
        sessionId: "session-main",
        frameId: "root"
      };
    },
    routeByFrameOrdinal(_tabId, frameOrdinal) {
      routeByOrdinalCalls.push(frameOrdinal);
      if (frameOrdinal === 2) {
        return {
          sessionId: "session-checkout",
          frameId: "checkout-frame"
        };
      }

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
    runtime,
    routeByOrdinalCalls
  };
}

describe("Task4 UI/UX E2E validation", () => {
  it("keeps deterministic action timeline, uses frame-ordinal routes, and stops at first failed step", async () => {
    const { runtime, transport, routeByOrdinalCalls } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-click" } });
    transport.queueResponse("DOM.scrollIntoViewIfNeeded", {});
    transport.queueResponse("Runtime.callFunctionOn", { result: { value: true } });

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-type" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("DOM.focus", {});
    transport.queueError("Input.insertText", new Error("element is not editable"));

    const result = await dispatcher.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        steps: [
          { kind: "click", ref: "f2:101" },
          { kind: "type", ref: "f2:102", text: "abc" },
          { kind: "key", key: "Enter" }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [
        { index: 0, ok: true },
        { index: 1, ok: false, error_code: "ACTION_TARGET_INVALID" }
      ],
      completed_steps: 1
    });

    expect(routeByOrdinalCalls).toEqual([2, 2]);
    expect(transport.sendCalls[0]).toMatchObject({
      method: "DOM.resolveNode",
      sessionId: "session-checkout"
    });
    expect(transport.sendCalls.some((call) => call.method === "Input.dispatchKeyEvent")).toBe(false);
  });

  it("surfaces non-retryable NO_HISTORY_ENTRY at navigation boundaries", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 0,
      entries: [
        {
          id: 1,
          url: "https://example.com"
        }
      ]
    });

    await expect(
      dispatcher.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "back"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "NO_HISTORY_ENTRY",
      retryable: false
    });
  });
});
