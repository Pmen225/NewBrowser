import type { JsonObject } from "../../../shared/src/transport";
import { normalizeBrowserRpcAction, normalizeToolRpcAction } from "../../../shared/src/transport";
import type { FrameTreeSnapshot, ICdpTransport, TabRecord } from "../../../src/cdp/types";

type ExecutionTargetKind = "page" | "extension" | "internal" | "unknown";

interface TargetInfoLike {
  targetId: string;
  type: string;
  url?: string;
}

interface ExecutionTargetSessionRegistry {
  getTab(tabId: string): TabRecord | undefined;
  listTabs(): TabRecord[];
  attachTab(targetId: string): Promise<TabRecord>;
  enableDomains(tabId: string): Promise<void>;
  refreshFrameTree(tabId: string): Promise<FrameTreeSnapshot>;
}

export interface ResolvedExecutionTarget {
  tabId: string;
  kind: ExecutionTargetKind;
  recovered: boolean;
  url?: string;
}

export interface ExecutionTargetResolverOptions {
  transport: ICdpTransport;
  sessionRegistry: ExecutionTargetSessionRegistry;
  getActiveTabId: () => string | undefined;
  getDefaultTabId: () => string | undefined;
  getLastPageTabId: () => string | undefined;
  onResolvedPageTab?: (tabId: string, url?: string) => void;
}

const INTERNAL_URL_PREFIXES = [
  "about:",
  "brave://",
  "chrome://",
  "chrome-untrusted://",
  "devtools://",
  "edge://",
  "opera://",
  "vivaldi://",
  "view-source:"
] as const;

function classifyTarget(target: TargetInfoLike | undefined): ExecutionTargetKind {
  const url = target?.url?.trim();
  if (!url) {
    return "unknown";
  }

  if (url.startsWith("chrome-extension://")) {
    return "extension";
  }

  if (INTERNAL_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return "internal";
  }

  return "page";
}

function isPageLikeTarget(target: TargetInfoLike | undefined): boolean {
  if (!target) {
    return false;
  }

  if (target.type !== "page" && target.type !== "tab") {
    return false;
  }

  return classifyTarget(target) === "page";
}

function uniqueTabIds(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of values) {
    if (!value || value === "__system__" || seen.has(value)) {
      continue;
    }

    seen.add(value);
    ordered.push(value);
  }

  return ordered;
}

function actionNeedsPageTarget(action: string, params: JsonObject): boolean {
  const browserAction = normalizeBrowserRpcAction(action);
  if (browserAction === "ComputerBatch" || browserAction === "Navigate" || browserAction === "FormInput") {
    return true;
  }

  if (browserAction === "TabOperation") {
    if (action === "tabs_create") {
      return false;
    }

    const operation = typeof params.operation === "string" ? params.operation : undefined;
    return operation === "activate" || operation === "close";
  }

  const toolAction = normalizeToolRpcAction(action);
  return toolAction === "read_page" || toolAction === "find" || toolAction === "get_page_text";
}

async function loadTargets(transport: ICdpTransport): Promise<Map<string, TargetInfoLike>> {
  const response = await transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
  const byTargetId = new Map<string, TargetInfoLike>();

  for (const target of response.targetInfos ?? []) {
    byTargetId.set(target.targetId, target);
  }

  return byTargetId;
}

async function attachTargetAsTab(sessionRegistry: ExecutionTargetSessionRegistry, target: TargetInfoLike): Promise<TabRecord> {
  const existing = sessionRegistry.listTabs().find((tab) => tab.targetId === target.targetId);
  if (existing) {
    return existing;
  }

  const attached = await sessionRegistry.attachTab(target.targetId);
  await sessionRegistry.enableDomains(attached.tabId);
  await sessionRegistry.refreshFrameTree(attached.tabId);
  return attached;
}

export function createExecutionTargetResolver(options: ExecutionTargetResolverOptions) {
  async function describeTab(tabId: string | undefined): Promise<ResolvedExecutionTarget | undefined> {
    if (!tabId || tabId === "__system__") {
      return undefined;
    }

    const tab = options.sessionRegistry.getTab(tabId);
    if (!tab) {
      return undefined;
    }

    const targets = await loadTargets(options.transport);
    const target = targets.get(tab.targetId);

    return {
      tabId,
      kind: classifyTarget(target),
      recovered: false,
      url: target?.url
    };
  }

  async function resolveForAction(action: string, requestedTabId: string, params: JsonObject): Promise<ResolvedExecutionTarget> {
    if (!actionNeedsPageTarget(action, params)) {
      return {
        tabId: requestedTabId,
        kind: "unknown",
        recovered: false
      };
    }

    const targets = await loadTargets(options.transport);
    const candidateTabIds = uniqueTabIds([
      requestedTabId,
      options.getActiveTabId(),
      options.getLastPageTabId(),
      options.getDefaultTabId(),
      ...options.sessionRegistry.listTabs().map((tab) => tab.tabId)
    ]);

    for (const candidateTabId of candidateTabIds) {
      const tab = options.sessionRegistry.getTab(candidateTabId);
      if (!tab) {
        continue;
      }

      const target = targets.get(tab.targetId);
      if (!isPageLikeTarget(target)) {
        continue;
      }

      options.onResolvedPageTab?.(candidateTabId, target?.url);
      return {
        tabId: candidateTabId,
        kind: "page",
        recovered: candidateTabId !== requestedTabId,
        url: target?.url
      };
    }

    const fallbackTarget = [...targets.values()].find((target) => isPageLikeTarget(target));
    if (fallbackTarget) {
      const attached = await attachTargetAsTab(options.sessionRegistry, fallbackTarget);
      options.onResolvedPageTab?.(attached.tabId, fallbackTarget.url);
      return {
        tabId: attached.tabId,
        kind: "page",
        recovered: attached.tabId !== requestedTabId,
        url: fallbackTarget.url
      };
    }

    const created = await options.transport.send<{ targetId: string }>("Target.createTarget", {
      url: "about:blank"
    });
    const attached = await options.sessionRegistry.attachTab(created.targetId);
    await options.sessionRegistry.enableDomains(attached.tabId);
    await options.sessionRegistry.refreshFrameTree(attached.tabId);
    options.onResolvedPageTab?.(attached.tabId, "about:blank");

    return {
      tabId: attached.tabId,
      kind: "page",
      recovered: attached.tabId !== requestedTabId,
      url: "about:blank"
    };
  }

  return {
    describeTab,
    resolveForAction
  };
}
