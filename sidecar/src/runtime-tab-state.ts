import type { TabRecord } from "../../src/cdp/types";

export interface RuntimeTabStateInput {
  activeTabId?: string;
  lastPageTabId?: string;
  defaultTabId?: string;
  tabs: Pick<TabRecord, "tabId" | "targetId">[];
}

export interface RuntimeTabState {
  activeTabId?: string;
  lastPageTabId?: string;
  defaultTabId?: string;
}

function asRegisteredTabId(tabIds: Set<string>, tabId: string | undefined): string | undefined {
  if (!tabId) {
    return undefined;
  }

  return tabIds.has(tabId) ? tabId : undefined;
}

export function resolveRuntimeTabState(input: RuntimeTabStateInput): RuntimeTabState {
  const tabIds = new Set(input.tabs.map((tab) => tab.tabId));
  const firstAttachedTabId = input.tabs[0]?.tabId;
  const activeTabId = asRegisteredTabId(tabIds, input.activeTabId);
  const lastPageTabId = asRegisteredTabId(tabIds, input.lastPageTabId);
  const defaultTabId = asRegisteredTabId(tabIds, input.defaultTabId);

  return {
    activeTabId: activeTabId ?? lastPageTabId ?? defaultTabId ?? firstAttachedTabId,
    lastPageTabId: lastPageTabId ?? activeTabId,
    defaultTabId
  };
}
