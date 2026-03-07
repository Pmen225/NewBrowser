import { describe, expect, it } from "vitest";

import { BrowserActionError } from "../../src/cdp/browser-actions";
import { groupTabsViaExtensionContext, ungroupTabsViaExtensionContext } from "../../sidecar/src/cdp/extension-tab-groups";
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
    ).rejects.toMatchObject<Partial<BrowserActionError>>({
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
});
