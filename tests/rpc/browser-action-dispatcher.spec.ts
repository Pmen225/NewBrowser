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
          sessionId: "session-child",
          frameId: "child-frame"
        };
      }

      throw {
        code: "FRAME_NOT_FOUND",
        message: `Frame ordinal ${frameOrdinal} not found`,
        retryable: false
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
        },
        {
          tabId: "tab-2",
          targetId: "target-tab-2",
          sessionId: "session-2",
          status: "attached",
          attachedAt: "2026-02-27T00:00:01.000Z"
        }
      ];
    },
    getJavaScriptDialog() {
      return undefined;
    }
  };

  return {
    transport,
    runtime,
    routeByOrdinalCalls
  };
}

describe("browser action dispatcher", () => {
  it("supports Task 4 actions", () => {
    const { runtime } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    expect(dispatcher.supports?.("ComputerBatch")).toBe(true);
    expect(dispatcher.supports?.("Navigate")).toBe(true);
    expect(dispatcher.supports?.("FormInput")).toBe(true);
    expect(dispatcher.supports?.("TabOperation")).toBe(true);
    expect(dispatcher.supports?.("computer")).toBe(true);
    expect(dispatcher.supports?.("navigate")).toBe(true);
    expect(dispatcher.supports?.("form_input")).toBe(true);
    expect(dispatcher.supports?.("tabs_create")).toBe(true);
    expect(dispatcher.supports?.("ping")).toBe(false);
  });

  it("provides navigation reliability hooks with deterministic history probing", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 0,
      entries: [{ id: 1, url: "https://example.com/start" }]
    });
    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 1,
      entries: [
        { id: 1, url: "https://example.com/start" },
        { id: 2, url: "https://example.com/next" }
      ]
    });

    const hooks = dispatcher.getReliabilityHooks?.(
      "Navigate",
      "tab-1",
      {
        mode: "to",
        url: "https://example.com/next"
      }
    );

    expect(hooks).toBeDefined();

    await hooks?.beforeAttempt?.({
      action: "Navigate",
      tab_id: "tab-1",
      params: {
        mode: "to",
        url: "https://example.com/next"
      },
      attempt: 1,
      signal: new AbortController().signal,
      policy: {
        max_attempts: 3,
        wait_timeout_ms: 100,
        network_idle_quiet_ms: 25,
        selector_poll_ms: 10
      }
    });

    const directives = await hooks?.waitFor?.({
      action: "Navigate",
      tab_id: "tab-1",
      params: {
        mode: "to",
        url: "https://example.com/next"
      },
      attempt: 1,
      signal: new AbortController().signal,
      policy: {
        max_attempts: 3,
        wait_timeout_ms: 100,
        network_idle_quiet_ms: 25,
        selector_poll_ms: 10
      },
      result: {
        url: "https://example.com/next"
      }
    });

    expect(directives).toEqual([
      {
        kind: "navigation",
        expected_url: "https://example.com/next"
      },
      {
        kind: "network_idle",
        quiet_ms: 25
      }
    ]);

    const navigationReady = await hooks?.waitForNavigation?.("https://example.com/next");
    expect(navigationReady).toBe(true);
  });

  it("treats http-to-https redirects as a satisfied navigation target", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("Page.getNavigationHistory", {
      currentIndex: 1,
      entries: [
        { id: 1, url: "about:blank" },
        { id: 2, url: "https://the-internet.herokuapp.com/" }
      ]
    });

    const hooks = dispatcher.getReliabilityHooks?.(
      "Navigate",
      "tab-1",
      {
        mode: "to",
        url: "http://the-internet.herokuapp.com"
      }
    );

    const navigationReady = await hooks?.waitForNavigation?.("http://the-internet.herokuapp.com");
    expect(navigationReady).toBe(true);
  });

  it("rejects invalid Navigate payloads with INVALID_REQUEST", async () => {
    const { runtime } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    await expect(
      dispatcher.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false
    });
  });

  it("normalizes protocol-less navigate URLs before dispatching to CDP", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("Page.addScriptToEvaluateOnNewDocument", {});
    transport.queueResponse("Page.navigate", {});

    const result = await dispatcher.dispatch(
      "Navigate",
      "tab-1",
      {
        mode: "to",
        url: "example.com/docs"
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      url: "https://example.com/docs"
    });
    expect(transport.sendCalls.find((call) => call.method === "Page.navigate")).toMatchObject({
      method: "Page.navigate",
      params: {
        url: "https://example.com/docs"
      }
    });
  });

  it("returns deterministic fail-fast result for invalid ref before CDP calls", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    const result = await dispatcher.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        steps: [
          {
            kind: "click",
            ref: "bad-ref"
          },
          {
            kind: "key",
            key: "Enter"
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: false, error_code: "INVALID_REF" }],
      completed_steps: 0
    });
    expect(transport.sendCalls).toHaveLength(0);
  });

  it("maps stale node failures to retryable STALE_REF errors", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueError("DOM.resolveNode", new Error("No node with given id"));

    await expect(
      dispatcher.dispatch(
        "FormInput",
        "tab-1",
        {
          fields: [
            {
              ref: "f0:999",
              kind: "text",
              value: "hello"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "STALE_REF",
      retryable: true
    });
  });

  it("lists tabs through TabOperation", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        { targetId: "target-tab-1", url: "https://example.com/one", title: "One", type: "page" },
        { targetId: "target-tab-2", url: "https://example.com/two", title: "Two", type: "page" }
      ]
    });

    const result = await dispatcher.dispatch(
      "TabOperation",
      "tab-1",
      {
        operation: "list"
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      tabs: [
        { tab_id: "tab-1", target_id: "target-tab-1", status: "attached", url: "https://example.com/one", title: "One" },
        { tab_id: "tab-2", target_id: "target-tab-2", status: "attached", url: "https://example.com/two", title: "Two" }
      ]
    });
  });

  it("handles canonical tabs_create alias", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });
    transport.queueResponse("Target.createTarget", { targetId: "target-new" });

    const result = await dispatcher.dispatch(
      "tabs_create",
      "tab-1",
      {
        url: "https://example.com"
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      status: "ok"
    });
  });

  it("preserves explicit tabs_create operations (list)", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        { targetId: "target-tab-1", url: "https://example.com/one", title: "One", type: "page" },
        { targetId: "target-tab-2", url: "https://example.com/two", title: "Two", type: "page" }
      ]
    });

    const result = await dispatcher.dispatch(
      "tabs_create",
      "tab-1",
      {
        operation: "list"
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      tabs: [
        { tab_id: "tab-1", target_id: "target-tab-1", status: "attached", url: "https://example.com/one", title: "One" },
        { tab_id: "tab-2", target_id: "target-tab-2", status: "attached", url: "https://example.com/two", title: "Two" }
      ]
    });
  });

  it("routes non-root refs via routeByFrameOrdinal", async () => {
    const { runtime, transport, routeByOrdinalCalls } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    transport.queueResponse("DOM.resolveNode", { object: { objectId: "obj-child" } });
    transport.queueResponse("Runtime.callFunctionOn", {
      result: {
        value: {
          blocked: false
        }
      }
    });
    transport.queueResponse("Runtime.callFunctionOn", { result: { value: true } });
    transport.queueResponse("Runtime.callFunctionOn", { result: { value: "hello" } });

    const result = await dispatcher.dispatch(
      "FormInput",
      "tab-1",
      {
        fields: [{ ref: "f2:101", kind: "text", value: "hello" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      updated: 1,
      applied: [
        {
          ref: "f2:101",
          kind: "text",
          requested_value: "hello",
          confirmed_value: "hello"
        }
      ]
    });
    expect(routeByOrdinalCalls).toEqual([2]);
    expect(transport.sendCalls[0]).toMatchObject({
      method: "DOM.resolveNode",
      sessionId: "session-child"
    });
  });

  it("accepts explicit screenshot steps via the dispatcher parser", async () => {
    const { runtime, transport } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });
    transport.queueResponse("Page.captureScreenshot", {
      data: Buffer.from("dispatcher-shot").toString("base64")
    });

    const result = await dispatcher.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        steps: [{ kind: "screenshot" }]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      steps: [{ index: 0, ok: true }],
      completed_steps: 1,
      screenshot_b64: Buffer.from("dispatcher-shot").toString("base64")
    });
  });

  it("returns FRAME_NOT_FOUND when non-root frame ordinal cannot be resolved", async () => {
    const { runtime } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    await expect(
      dispatcher.dispatch(
        "FormInput",
        "tab-1",
        {
          fields: [{ ref: "f9:101", kind: "text", value: "hello" }]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "FRAME_NOT_FOUND",
      retryable: false
    });
  });

  it("guides the agent toward form_input when a computer payload looks like a form control mutation", async () => {
    const { runtime } = createRuntime();
    const dispatcher = createBrowserActionDispatcher({ runtime });

    await expect(
      dispatcher.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          steps: [
            {
              action: "select_option",
              ref: "f0:123",
              value: "Option 2"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      message: expect.stringContaining("FormInput"),
      details: {
        suggested_action: "FormInput"
      }
    });

    await expect(
      dispatcher.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          steps: [
            {
              action: "check",
              ref: "f0:123"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      message: expect.stringContaining("checkbox"),
      details: {
        suggested_action: "FormInput"
      }
    });
  });
});
