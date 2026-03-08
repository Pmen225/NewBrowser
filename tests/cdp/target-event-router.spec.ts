import { describe, expect, it } from "vitest";

import { CdpRegistryError } from "../../src/cdp/types";
import { FrameRegistry } from "../../src/cdp/frame-registry";
import { SessionRegistry } from "../../src/cdp/session-registry";
import { TargetEventRouter } from "../../src/cdp/target-event-router";
import { FakeTransport } from "./helpers/fake-transport";

function makeFrame(id: string, parentId?: string, url?: string) {
  return {
    id,
    parentId,
    url: url ?? `https://example.com/${id}`,
    name: id
  };
}

describe("TargetEventRouter", () => {
  it("auto-attaches top-level page targets created after startup and removes them on destroy", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.setDiscoverTargets", {});
    transport.queueResponse("Target.attachToTarget", { sessionId: "session-panel" });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});
    transport.queueResponse("Page.setLifecycleEventsEnabled", {});
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("panel-root", undefined, "chrome-extension://ext/panel.html")
      }
    });

    router.start();

    await transport.emit("Target.targetCreated", {
      params: {
        targetInfo: {
          targetId: "target-panel",
          type: "page",
          title: "Assistant",
          url: "chrome-extension://ext/panel.html",
          attached: false,
          canAccessOpener: false
        }
      }
    });

    expect(sessionRegistry.listTabs()).toHaveLength(1);
    expect(sessionRegistry.listTabs()[0]).toMatchObject({
      tabId: "tab-1",
      targetId: "target-panel",
      sessionId: "session-panel"
    });

    await transport.emit("Target.targetDestroyed", {
      params: {
        targetId: "target-panel"
      }
    });

    expect(sessionRegistry.listTabs()).toHaveLength(0);
  });

  it("binds OOPIF child session from attachedToTarget", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      }
    });
    transport.queueResponse("DOM.getFrameOwner", { backendNodeId: 500 });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});

    const tab = await sessionRegistry.attachTab("target-1");
    await sessionRegistry.refreshFrameTree(tab.tabId);

    router.start();

    await transport.emit("Target.attachedToTarget", {
      sessionId: "session-main",
      params: {
        sessionId: "session-child",
        waitingForDebugger: false,
        targetInfo: {
          targetId: "child",
          type: "iframe",
          title: "",
          url: "https://example.com/child",
          attached: true,
          canAccessOpener: false,
          parentFrameId: "root"
        }
      }
    });

    expect(sessionRegistry.route(tab.tabId, "child")).toEqual({
      sessionId: "session-child",
      frameId: "child"
    });

    const autoAttachCall = transport.sendCalls.find(
      (call) => call.method === "Target.setAutoAttach" && call.sessionId === "session-child"
    );
    expect(autoAttachCall).toBeDefined();
  });

  it("handles attach -> navigate -> detach flow and removes stale entries", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      }
    });
    transport.queueResponse("DOM.getFrameOwner", { backendNodeId: 600 });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});

    const tab = await sessionRegistry.attachTab("target-1");
    await sessionRegistry.refreshFrameTree(tab.tabId);

    router.start();

    await transport.emit("Target.attachedToTarget", {
      sessionId: "session-main",
      params: {
        sessionId: "session-child",
        waitingForDebugger: false,
        targetInfo: {
          targetId: "child",
          type: "iframe",
          title: "",
          url: "https://example.com/child",
          attached: true,
          canAccessOpener: false,
          parentFrameId: "root"
        }
      }
    });

    await transport.emit("Page.frameNavigated", {
      sessionId: "session-child",
      params: {
        frame: makeFrame("child", "root", "https://example.com/child/next")
      }
    });

    expect(frameRegistry.listByTab(tab.tabId).find((frame) => frame.frameId === "child")?.url).toBe(
      "https://example.com/child/next"
    );

    await transport.emit("Page.frameDetached", {
      sessionId: "session-child",
      params: {
        frameId: "child",
        reason: "remove"
      }
    });

    expect(frameRegistry.listByTab(tab.tabId).map((frame) => frame.frameId)).toEqual(["root"]);
    expect(() => sessionRegistry.route(tab.tabId, "child")).toThrowError(CdpRegistryError);
  });

  it("cleans up child session mappings on Target.detachedFromTarget", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      }
    });
    transport.queueResponse("DOM.getFrameOwner", { backendNodeId: 700 });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});

    const tab = await sessionRegistry.attachTab("target-1");
    await sessionRegistry.refreshFrameTree(tab.tabId);
    router.start();

    await transport.emit("Target.attachedToTarget", {
      sessionId: "session-main",
      params: {
        sessionId: "session-child",
        waitingForDebugger: false,
        targetInfo: {
          targetId: "child",
          type: "iframe",
          title: "",
          url: "https://example.com/child",
          attached: true,
          canAccessOpener: false,
          parentFrameId: "root"
        }
      }
    });

    expect(sessionRegistry.route(tab.tabId, "child").sessionId).toBe("session-child");

    await transport.emit("Target.detachedFromTarget", {
      sessionId: "session-main",
      params: {
        sessionId: "session-child"
      }
    });

    expect(() => sessionRegistry.route(tab.tabId, "child")).toThrowError(CdpRegistryError);
    expect(frameRegistry.listByTab(tab.tabId).map((frame) => frame.frameId)).toEqual(["root"]);
  });

  it("tracks JavaScript dialog lifecycle for the owning tab session", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Target.setDiscoverTargets", {});

    const tab = await sessionRegistry.attachTab("target-1");
    router.start();

    await transport.emit("Page.javascriptDialogOpening", {
      sessionId: "session-main",
      params: {
        url: "https://example.com",
        message: "I am a JS Confirm",
        type: "confirm",
        hasBrowserHandler: true
      }
    });

    expect(sessionRegistry.getJavaScriptDialog(tab.tabId)).toMatchObject({
      tabId: tab.tabId,
      sessionId: "session-main",
      type: "confirm",
      message: "I am a JS Confirm"
    });

    await transport.emit("Page.javascriptDialogClosed", {
      sessionId: "session-main",
      params: {
        result: true,
        userInput: ""
      }
    });

    expect(sessionRegistry.getJavaScriptDialog(tab.tabId)).toBeUndefined();
  });

  it("tracks JavaScript dialogs when CDP omits the session id but the URL uniquely matches a tab", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const sessionRegistry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");
    const router = new TargetEventRouter(transport, sessionRegistry, frameRegistry);

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root", undefined, "https://example.com/javascript_alerts")
      }
    });
    transport.queueResponse("Target.setDiscoverTargets", {});

    const tab = await sessionRegistry.attachTab("target-1");
    await sessionRegistry.refreshFrameTree(tab.tabId);
    router.start();

    await transport.emit("Page.javascriptDialogOpening", {
      params: {
        url: "https://example.com/javascript_alerts",
        message: "I am a JS Prompt",
        type: "prompt",
        defaultPrompt: "",
        hasBrowserHandler: true
      }
    });

    expect(sessionRegistry.getJavaScriptDialog(tab.tabId)).toMatchObject({
      tabId: tab.tabId,
      sessionId: "session-main",
      type: "prompt",
      message: "I am a JS Prompt"
    });

    await transport.emit("Page.javascriptDialogClosed", {
      params: {
        result: true,
        userInput: "Atlas"
      }
    });

    expect(sessionRegistry.getJavaScriptDialog(tab.tabId)).toBeUndefined();
  });
});
