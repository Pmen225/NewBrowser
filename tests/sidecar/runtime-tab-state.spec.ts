import { describe, expect, it } from "vitest";

import { resolveRuntimeTabState } from "../../sidecar/src/runtime-tab-state";

describe("runtime tab state", () => {
  it("prefers a live explicit active tab over stale remembered tabs", () => {
    const resolved = resolveRuntimeTabState({
      activeTabId: "tab-active",
      lastPageTabId: "tab-stale",
      defaultTabId: "tab-default",
      tabs: [
        { tabId: "tab-active", targetId: "target-active" },
        { tabId: "tab-default", targetId: "target-default" }
      ]
    });

    expect(resolved).toEqual({
      activeTabId: "tab-active",
      lastPageTabId: "tab-active",
      defaultTabId: "tab-default"
    });
  });

  it("recovers from a stale active tab by falling back to a live page tab", () => {
    const resolved = resolveRuntimeTabState({
      activeTabId: "tab-stale",
      lastPageTabId: "tab-live",
      defaultTabId: "tab-default",
      tabs: [
        { tabId: "tab-live", targetId: "target-live" },
        { tabId: "tab-default", targetId: "target-default" }
      ]
    });

    expect(resolved).toEqual({
      activeTabId: "tab-live",
      lastPageTabId: "tab-live",
      defaultTabId: "tab-default"
    });
  });

  it("falls back to the first attached tab when every remembered pointer is stale", () => {
    const resolved = resolveRuntimeTabState({
      activeTabId: "tab-stale-active",
      lastPageTabId: "tab-stale-page",
      defaultTabId: "tab-stale-default",
      tabs: [
        { tabId: "tab-4", targetId: "target-4" },
        { tabId: "tab-7", targetId: "target-7" }
      ]
    });

    expect(resolved).toEqual({
      activeTabId: "tab-4",
      lastPageTabId: undefined,
      defaultTabId: undefined
    });
  });

  it("clears active export when no attached tabs remain", () => {
    const resolved = resolveRuntimeTabState({
      activeTabId: "tab-stale",
      lastPageTabId: "tab-stale-page",
      defaultTabId: "tab-stale-default",
      tabs: []
    });

    expect(resolved).toEqual({
      activeTabId: undefined,
      lastPageTabId: undefined,
      defaultTabId: undefined
    });
  });
});
