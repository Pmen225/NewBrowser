import { describe, expect, it } from "vitest";

import { CdpRegistryError } from "../../src/cdp/types";
import { FrameRegistry } from "../../src/cdp/frame-registry";
import { SessionRegistry } from "../../src/cdp/session-registry";
import { FakeTransport } from "./helpers/fake-transport";

function makeFrame(id: string, parentId?: string, url?: string) {
  return {
    id,
    parentId,
    url: url ?? `https://example.com/${id}`,
    name: id
  };
}

describe("SessionRegistry", () => {
  it("attaches tab and stores session mapping", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });

    const tab = await registry.attachTab("target-1");

    expect(tab).toMatchObject({
      tabId: "tab-1",
      targetId: "target-1",
      sessionId: "session-main",
      status: "attached"
    });
    expect(transport.sendCalls[0]).toMatchObject({
      method: "Target.attachToTarget",
      params: { targetId: "target-1", flatten: true }
    });
  });

  it("deduplicates concurrent attaches for the same target", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });

    const [first, second] = await Promise.all([
      registry.attachTab("target-1"),
      registry.attachTab("target-1")
    ]);

    expect(first.tabId).toBe("tab-1");
    expect(second.tabId).toBe("tab-1");
    expect(transport.sendCalls.filter((call) => call.method === "Target.attachToTarget")).toHaveLength(1);
  });

  it("enforces domain enable order and fails hard on partial enablement", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueError("DOM.enable", new Error("DOM unavailable"));

    const tab = await registry.attachTab("target-1");

    let thrown: unknown;
    try {
      await registry.enableDomains(tab.tabId);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CdpRegistryError);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("DOMAIN_ENABLE_FAILED");

    const methods = transport.sendCalls.map((call) => call.method);
    expect(methods).toEqual([
      "Target.attachToTarget",
      "Accessibility.enable",
      "DOM.enable"
    ]);
    expect(methods).not.toContain("Page.enable");
    expect(methods).not.toContain("Network.enable");
    expect(methods).not.toContain("Target.setAutoAttach");
  });

  it("enables required domains and configures auto-attach in flat mode", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});
    transport.queueResponse("Page.setLifecycleEventsEnabled", {});

    const tab = await registry.attachTab("target-1");
    await registry.enableDomains(tab.tabId);

    const methods = transport.sendCalls.map((call) => call.method);
    expect(methods).toEqual([
      "Target.attachToTarget",
      "Accessibility.enable",
      "DOM.enable",
      "Page.enable",
      "Network.enable",
      "Target.setAutoAttach",
      "Page.setLifecycleEventsEnabled"
    ]);
    expect(transport.sendCalls.find((call) => call.method === "Target.setAutoAttach")).toMatchObject({
      method: "Target.setAutoAttach",
      params: {
        autoAttach: true,
        waitForDebuggerOnStart: false,
        flatten: true
      },
      sessionId: "session-main"
    });
  });

  it("treats lifecycle-event enablement as non-fatal", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Accessibility.enable", {});
    transport.queueResponse("DOM.enable", {});
    transport.queueResponse("Page.enable", {});
    transport.queueResponse("Network.enable", {});
    transport.queueResponse("Target.setAutoAttach", {});
    transport.queueError("Page.setLifecycleEventsEnabled", new Error("Unsupported"));

    const tab = await registry.attachTab("target-1");

    await expect(registry.enableDomains(tab.tabId)).resolves.toBeUndefined();
    expect(transport.sendCalls.map((call) => call.method)).toContain("Page.setLifecycleEventsEnabled");
  });

  it("refreshes frame tree deterministically and resolves owner nodes", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      }
    });
    transport.queueResponse("DOM.getFrameOwner", { backendNodeId: 1001 });

    const tab = await registry.attachTab("target-1");
    const snapshot = await registry.refreshFrameTree(tab.tabId);

    expect(snapshot.frameCount).toBe(2);
    expect(snapshot.frames.map((frame) => frame.frameId)).toEqual(["root", "child"]);
    expect(snapshot.frames.map((frame) => frame.frameOrdinal)).toEqual([0, 1]);
    expect(snapshot.frames.find((frame) => frame.frameId === "child")?.ownerBackendNodeId).toBe(1001);
    expect(registry.route(tab.tabId, "child")).toEqual({ sessionId: "session-main", frameId: "child" });
    expect(registry.routeByFrameOrdinal(tab.tabId, 1)).toEqual({ sessionId: "session-main", frameId: "child" });
  });

  it("treats missing frame owner as non-fatal", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    transport.queueResponse("Page.getFrameTree", {
      frameTree: {
        frame: makeFrame("root"),
        childFrames: [{ frame: makeFrame("child", "root") }]
      }
    });
    transport.queueError("DOM.getFrameOwner", new Error("top frame or stale frame"));

    const tab = await registry.attachTab("target-1");
    const snapshot = await registry.refreshFrameTree(tab.tabId);

    expect(snapshot.frameCount).toBe(2);
    expect(snapshot.frames.find((frame) => frame.frameId === "child")?.ownerBackendNodeId).toBeUndefined();
  });

  it("reattaches a tab with a fresh session while preserving the tab id", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main-1" });
    const tab = await registry.attachTab("target-1");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main-2" });
    const reattached = await registry.reattachTab(tab.tabId);

    expect(reattached.tabId).toBe(tab.tabId);
    expect(reattached.targetId).toBe("target-1");
    expect(reattached.sessionId).toBe("session-main-2");
    expect(registry.getTab(tab.tabId)?.sessionId).toBe("session-main-2");
    expect(registry.getTabIdBySession("session-main-1")).toBeUndefined();
    expect(registry.getTabIdBySession("session-main-2")).toBe(tab.tabId);
  });

  it("registers and clears a JavaScript dialog by tab id when session fallback is needed", async () => {
    const transport = new FakeTransport();
    const frameRegistry = new FrameRegistry(() => "2026-02-27T00:00:00.000Z");
    const registry = new SessionRegistry(transport, frameRegistry, () => "2026-02-27T00:00:00.000Z");

    transport.queueResponse("Target.attachToTarget", { sessionId: "session-main" });
    const tab = await registry.attachTab("target-1");

    registry.registerJavaScriptDialogForTab(tab.tabId, {
      frameId: "root",
      url: "https://example.com/javascript_alerts",
      message: "I am a JS Prompt",
      type: "prompt",
      defaultPrompt: "",
      hasBrowserHandler: true
    });

    expect(registry.getJavaScriptDialog(tab.tabId)).toMatchObject({
      tabId: tab.tabId,
      sessionId: "session-main",
      type: "prompt",
      message: "I am a JS Prompt"
    });

    registry.clearJavaScriptDialogForTab(tab.tabId);
    expect(registry.getJavaScriptDialog(tab.tabId)).toBeUndefined();
  });
});
