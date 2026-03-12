import { describe, expect, it, vi } from "vitest";

import type { FrameTreeSnapshot, TabRecord } from "../../src/cdp/types";
import { createActiveTabDispatcher } from "../../sidecar/src/rpc/active-tab-dispatcher";
import { FakeTransport } from "../cdp/helpers/fake-transport";

interface MockSessionRegistry {
  listTabs: () => TabRecord[];
  attachTab: ReturnType<typeof vi.fn>;
  bindChromeTabId: ReturnType<typeof vi.fn>;
  enableDomains: ReturnType<typeof vi.fn>;
  refreshFrameTree: ReturnType<typeof vi.fn>;
  tabs: Map<string, TabRecord>;
}

function createMockSessionRegistry(): MockSessionRegistry {
  const tabs = new Map<string, TabRecord>();

  return {
    tabs,
    listTabs: () => [...tabs.values()],
    attachTab: vi.fn(async (targetId: string): Promise<TabRecord> => {
      const tab: TabRecord = {
        tabId: `tab-${tabs.size + 1}`,
        targetId,
        sessionId: `session-${tabs.size + 1}`,
        status: "attached",
        attachedAt: new Date().toISOString()
      };
      tabs.set(tab.tabId, tab);
      return tab;
    }),
    bindChromeTabId: vi.fn((tabId: string, chromeTabId: number) => {
      const current = tabs.get(tabId);
      if (!current) {
        return;
      }
      tabs.set(tabId, { ...current, chromeTabId });
    }),
    enableDomains: vi.fn(async () => undefined),
    refreshFrameTree: vi.fn(async (tabId: string): Promise<FrameTreeSnapshot> => ({
      tabId,
      mainFrameId: "root",
      frameCount: 1,
      frames: [],
      refreshedAt: new Date().toISOString()
    }))
  };
}

describe("active tab dispatcher", () => {
  it("supports only SetActiveTab action", () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry
    });

    expect(dispatcher.supports?.("SetActiveTab")).toBe(true);
    expect(dispatcher.supports?.("Navigate")).toBe(false);
  });

  it("matches target by target_id before URL and returns existing tab", async () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    registry.tabs.set("tab-1", {
      tabId: "tab-1",
      targetId: "target-abc",
      sessionId: "session-1",
      status: "attached",
      attachedAt: "2026-03-01T00:00:00.000Z"
    });

    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-abc",
          type: "page",
          url: "https://example.com"
        }
      ]
    });

    const onChanged = vi.fn();

    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry,
      onActiveTabChanged: onChanged
    });

    const result = await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 42,
        target_id: "target-abc",
        url: "https://other.example.com"
      },
      new AbortController().signal
    );

    expect(result).toEqual({ tab_id: "tab-1", status: "ok" });
    expect(registry.attachTab).not.toHaveBeenCalled();
    expect(registry.bindChromeTabId).toHaveBeenCalledWith("tab-1", 42);
    expect(onChanged).toHaveBeenCalledWith("tab-1");
  });

  it("uses cached chrome_tab_id target mapping when target id/url absent", async () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-new",
          type: "page",
          url: "https://new.example.com"
        }
      ]
    });

    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry
    });

    const first = await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 77,
        url: "https://new.example.com"
      },
      new AbortController().signal
    );

    expect(first).toEqual({ tab_id: "tab-1", status: "ok" });

    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-new",
          type: "page",
          url: "https://new.example.com"
        }
      ]
    });

    const second = await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 77
      },
      new AbortController().signal
    );

    expect(second).toEqual({ tab_id: "tab-1", status: "ok" });
    expect(registry.attachTab).toHaveBeenCalledTimes(1);
    expect(registry.bindChromeTabId).toHaveBeenLastCalledWith("tab-1", 77);
  });

  it("returns not_found when no target matches", async () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    transport.queueResponse("Target.getTargets", {
      targetInfos: []
    });

    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry
    });

    const result = await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 99,
        url: "https://unknown.example.com"
      },
      new AbortController().signal
    );

    expect(result).toEqual({ tab_id: "", status: "not_found" });
  });

  it("allows target-only sync when chrome_tab_id is unavailable", async () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-loopback",
          type: "page",
          url: "http://127.0.0.1:4317/upload"
        }
      ]
    });

    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry
    });

    const result = await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        target_id: "target-loopback",
        url: "http://127.0.0.1:4317/upload",
        title: "Upload"
      },
      new AbortController().signal
    );

    expect(result).toEqual({ tab_id: "tab-1", status: "ok" });
    expect(registry.bindChromeTabId).not.toHaveBeenCalled();
    expect(registry.attachTab).toHaveBeenCalledWith("target-loopback");
  });

  it("notifies active tab change callback only when tab id changes", async () => {
    const transport = new FakeTransport();
    const registry = createMockSessionRegistry();

    registry.tabs.set("tab-1", {
      tabId: "tab-1",
      targetId: "target-abc",
      sessionId: "session-1",
      status: "attached",
      attachedAt: "2026-03-01T00:00:00.000Z"
    });

    const onChanged = vi.fn();
    const dispatcher = createActiveTabDispatcher({
      transport,
      sessionRegistry: registry,
      onActiveTabChanged: onChanged
    });

    transport.queueResponse("Target.getTargets", {
      targetInfos: [{ targetId: "target-abc", type: "page", url: "https://example.com" }]
    });

    await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 1,
        target_id: "target-abc"
      },
      new AbortController().signal
    );

    transport.queueResponse("Target.getTargets", {
      targetInfos: [{ targetId: "target-abc", type: "page", url: "https://example.com" }]
    });

    await dispatcher.dispatch(
      "SetActiveTab",
      "__system__",
      {
        chrome_tab_id: 1,
        target_id: "target-abc"
      },
      new AbortController().signal
    );

    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
