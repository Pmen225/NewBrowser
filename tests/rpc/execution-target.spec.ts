import { describe, expect, it, vi } from "vitest";

import type { FrameTreeSnapshot, TabRecord } from "../../src/cdp/types";
import { createExecutionTargetResolver } from "../../sidecar/src/rpc/execution-target";
import { FakeTransport } from "../cdp/helpers/fake-transport";

interface MockSessionRegistry {
  getTab: (tabId: string) => TabRecord | undefined;
  listTabs: () => TabRecord[];
  attachTab: ReturnType<typeof vi.fn>;
  enableDomains: ReturnType<typeof vi.fn>;
  refreshFrameTree: ReturnType<typeof vi.fn>;
}

function createMockSessionRegistry(tabs: TabRecord[]): MockSessionRegistry {
  const byId = new Map<string, TabRecord>(tabs.map((tab) => [tab.tabId, tab]));

  return {
    getTab: (tabId: string) => byId.get(tabId),
    listTabs: () => [...byId.values()],
    attachTab: vi.fn(async (targetId: string): Promise<TabRecord> => {
      const tab: TabRecord = {
        tabId: `tab-${byId.size + 1}`,
        targetId,
        sessionId: `session-${byId.size + 1}`,
        status: "attached",
        attachedAt: "2026-03-02T00:00:00.000Z"
      };
      byId.set(tab.tabId, tab);
      return tab;
    }),
    enableDomains: vi.fn(async () => undefined),
    refreshFrameTree: vi.fn(async (tabId: string): Promise<FrameTreeSnapshot> => ({
      tabId,
      mainFrameId: "root",
      frameCount: 1,
      frames: [],
      refreshedAt: "2026-03-02T00:00:00.000Z"
    }))
  };
}

describe("execution target resolver", () => {
  it("falls back from an extension tab to the last real page tab", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-extension",
          type: "page",
          url: "chrome-extension://abc/panel.html"
        },
        {
          targetId: "target-page",
          type: "page",
          url: "https://example.com"
        }
      ]
    });

    const sessionRegistry = createMockSessionRegistry([
      {
        tabId: "tab-extension",
        targetId: "target-extension",
        sessionId: "session-extension",
        status: "attached",
        attachedAt: "2026-03-02T00:00:00.000Z"
      },
      {
        tabId: "tab-page",
        targetId: "target-page",
        sessionId: "session-page",
        status: "attached",
        attachedAt: "2026-03-02T00:00:00.000Z"
      }
    ]);

    const rememberPageTab = vi.fn();
    const resolver = createExecutionTargetResolver({
      transport,
      sessionRegistry,
      getActiveTabId: () => "tab-extension",
      getDefaultTabId: () => "tab-extension",
      getLastPageTabId: () => "tab-page",
      onResolvedPageTab: rememberPageTab
    });

    const resolved = await resolver.resolveForAction("Navigate", "tab-extension", {
      mode: "to",
      url: "https://google.com"
    });

    expect(resolved).toEqual({
      tabId: "tab-page",
      kind: "page",
      recovered: true,
      url: "https://example.com"
    });
    expect(sessionRegistry.attachTab).not.toHaveBeenCalled();
    expect(rememberPageTab).toHaveBeenCalledWith("tab-page", "https://example.com");
  });

  it("creates and attaches a new page target when no real page tab exists", async () => {
    const transport = new FakeTransport();
    transport.queueResponse("Target.getTargets", {
      targetInfos: [
        {
          targetId: "target-extension",
          type: "page",
          url: "chrome-extension://abc/panel.html"
        }
      ]
    });
    transport.queueResponse("Target.createTarget", {
      targetId: "target-new-page"
    });

    const sessionRegistry = createMockSessionRegistry([
      {
        tabId: "tab-extension",
        targetId: "target-extension",
        sessionId: "session-extension",
        status: "attached",
        attachedAt: "2026-03-02T00:00:00.000Z"
      }
    ]);

    const resolver = createExecutionTargetResolver({
      transport,
      sessionRegistry,
      getActiveTabId: () => "tab-extension",
      getDefaultTabId: () => "tab-extension",
      getLastPageTabId: () => undefined
    });

    const resolved = await resolver.resolveForAction("ReadPage", "tab-extension", {});

    expect(resolved.tabId).toBe("tab-2");
    expect(resolved.kind).toBe("page");
    expect(resolved.recovered).toBe(true);
    expect(sessionRegistry.attachTab).toHaveBeenCalledWith("target-new-page");
    expect(sessionRegistry.enableDomains).toHaveBeenCalledWith("tab-2");
    expect(sessionRegistry.refreshFrameTree).toHaveBeenCalledWith("tab-2");
  });
});
