import { describe, expect, it } from "vitest";

import { BrowserActionError } from "../../src/cdp/browser-actions";
import {
  groupTabsViaExtensionContext,
  navigateSensitiveTabViaExtensionContext,
  ungroupTabsViaExtensionContext
} from "../../sidecar/src/cdp/extension-tab-groups";
import { FakeTransport } from "./helpers/fake-transport";

describe("extension tab grouping bridge", () => {
  it("groups tabs through the extension context", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        },
        {
          targetId: "target-tab-1",
          type: "page",
          url: "https://example.com/a",
          title: "A"
        },
        {
          targetId: "target-tab-2",
          type: "page",
          url: "https://example.com/b",
          title: "B"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          chromeTabIds: [11, 12],
          groupId: 5,
          groupName: "Atlas"
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      groupTabsViaExtensionContext(
        transport,
        [
          { tabId: "tab-1", targetId: "target-tab-1" },
          { tabId: "tab-2", targetId: "target-tab-2" }
        ],
        {
          groupName: "Atlas",
          groupColor: "blue"
        }
      )
    ).resolves.toEqual({
      tabIds: ["tab-1", "tab-2"],
      chromeTabIds: [11, 12],
      groupId: 5,
      groupName: "Atlas"
    });

    expect(transport.sendCalls.map((call) => call.method)).toEqual([
      "Target.getTargets",
      "Target.attachToTarget",
      "Runtime.evaluate",
      "Target.detachFromTarget"
    ]);
    expect(transport.sendCalls[2]?.sessionId).toBe("extension-session");
  });

  it("surfaces typed ambiguity failures from the extension context", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        },
        {
          targetId: "target-tab-1",
          type: "page",
          url: "https://example.com/a",
          title: "A"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: false,
          code: "TAB_GROUPING_AMBIGUOUS",
          error: "Matched multiple Chrome tabs for https://example.com/a"
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      groupTabsViaExtensionContext(
        transport,
        [{ tabId: "tab-1", targetId: "target-tab-1" }],
        {
          groupName: "Atlas"
        }
      )
    ).rejects.toMatchObject({
      code: "TAB_GROUPING_AMBIGUOUS",
      retryable: false
    });
  });

  it("ungroups tabs through the extension context", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        },
        {
          targetId: "target-tab-1",
          type: "page",
          url: "https://example.com/a",
          title: "A"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          chromeTabIds: [11]
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      ungroupTabsViaExtensionContext(transport, [{ tabId: "tab-1", targetId: "target-tab-1" }])
    ).resolves.toEqual({
      tabIds: ["tab-1"],
      chromeTabIds: [11]
    });
  });

  it("navigates a tab to a sensitive chrome page through the extension context", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        },
        {
          targetId: "target-tab-1",
          type: "page",
          url: "https://example.com/a",
          title: "A"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          chromeTabIds: [11],
          url: "chrome://settings/",
          title: "Settings"
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      navigateSensitiveTabViaExtensionContext(
        transport,
        { tabId: "tab-1", targetId: "target-tab-1" },
        "chrome://settings"
      )
    ).resolves.toEqual({
      tabId: "tab-1",
      chromeTabId: 11,
      url: "chrome://settings/",
      title: "Settings"
    });

    expect(transport.sendCalls[2]).toMatchObject({
      method: "Runtime.evaluate"
    });
    const runtimeEvaluateCall = transport.sendCalls[2] as { params?: { expression?: string } } | undefined;
    expect(String(runtimeEvaluateCall?.params?.expression ?? "")).toContain('"url":"chrome://settings"');
  });

  it("prefers a direct chrome tab id match when target metadata becomes ambiguous", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          chromeTabIds: [11],
          url: "chrome://flags/"
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await expect(
      navigateSensitiveTabViaExtensionContext(
        transport,
        { tabId: "tab-1", targetId: "target-tab-1", chromeTabId: 11 },
        "chrome://flags"
      )
    ).resolves.toEqual({
      tabId: "tab-1",
      chromeTabId: 11,
      url: "chrome://flags/"
    });
  });

  it("prefers the background service worker over the panel page as the extension context", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "panel-target",
          type: "page",
          url: "chrome-extension://abc123/panel.html",
          title: "Assistant"
        },
        {
          targetId: "background-target",
          type: "service_worker",
          url: "chrome-extension://abc123/background.js",
          title: "background"
        },
        {
          targetId: "target-tab-1",
          type: "page",
          url: "https://example.com/a",
          title: "A"
        }
      ]
    });
    transport.queueResponse("Target.attachToTarget", { sessionId: "extension-session" });
    transport.queueResponse("Runtime.evaluate", {
      result: {
        value: {
          ok: true,
          chromeTabIds: [11],
          url: "chrome://settings/"
        }
      }
    });
    transport.queueResponse("Target.detachFromTarget", {});

    await navigateSensitiveTabViaExtensionContext(
      transport,
      { tabId: "tab-1", targetId: "target-tab-1", chromeTabId: 11 },
      "chrome://settings"
    );

    expect(transport.sendCalls[1]).toMatchObject({
      method: "Target.attachToTarget",
      params: {
        targetId: "background-target",
        flatten: true
      }
    });
  });
});
