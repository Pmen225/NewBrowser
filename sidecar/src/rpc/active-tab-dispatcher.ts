import type { FrameTreeSnapshot, ICdpTransport, TabRecord } from "../../../src/cdp/types";
import { parseSetActiveTabParams, type JsonObject } from "../../../shared/src/transport";
import type { ActionDispatcher } from "./dispatcher";

interface ActiveTabSessionRegistry {
  listTabs(): TabRecord[];
  attachTab(targetId: string): Promise<TabRecord>;
  enableDomains(tabId: string): Promise<void>;
  refreshFrameTree(tabId: string): Promise<FrameTreeSnapshot>;
}

interface TargetInfoLike {
  targetId: string;
  type: string;
  url: string;
  title?: string;
}

export interface ActiveTabDispatcherOptions {
  transport: ICdpTransport;
  sessionRegistry: ActiveTabSessionRegistry;
  onActiveTabChanged?: (tabId: string) => void;
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Error & {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  const error = new Error(message) as Error & {
    code: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function normalizeUrl(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

function findByTargetId(targets: TargetInfoLike[], targetId: string | undefined): TargetInfoLike | undefined {
  if (!targetId || targetId.trim().length === 0) {
    return undefined;
  }

  return targets.find((target) => target.targetId === targetId && (target.type === "page" || target.type === "tab"));
}

function findMatchingTarget(
  targets: TargetInfoLike[],
  options: {
    targetId?: string;
    cachedTargetId?: string;
    url?: string;
    title?: string;
  }
): TargetInfoLike | undefined {
  const pageTargets = targets.filter((target) => target.type === "page" || target.type === "tab");

  const byExplicitTargetId = findByTargetId(pageTargets, options.targetId);
  if (byExplicitTargetId) {
    return byExplicitTargetId;
  }

  const byCachedTargetId = findByTargetId(pageTargets, options.cachedTargetId);
  if (byCachedTargetId) {
    return byCachedTargetId;
  }

  if (options.url && options.url.trim().length > 0) {
    const normalized = normalizeUrl(options.url);
    const byUrl = pageTargets.find((target) => normalizeUrl(target.url) === normalized);
    if (byUrl) {
      return byUrl;
    }
  }

  if (options.title && options.title.trim().length > 0) {
    const byTitle = pageTargets.find((target) => target.title === options.title);
    if (byTitle) {
      return byTitle;
    }
  }

  return undefined;
}

export function createActiveTabDispatcher(options: ActiveTabDispatcherOptions): ActionDispatcher {
  const chromeTabToTargetId = new Map<number, string>();
  let lastNotifiedTabId: string | undefined;

  const notifyIfChanged = (tabId: string): void => {
    if (lastNotifiedTabId === tabId) {
      return;
    }
    lastNotifiedTabId = tabId;
    options.onActiveTabChanged?.(tabId);
  };

  return {
    supports(action: string): boolean {
      return action === "SetActiveTab";
    },
    async dispatch(action: string, _tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "SetActiveTab") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsed = parseSetActiveTabParams(params);
      if (!parsed) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid SetActiveTab params", false);
      }

      const targets = await options.transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
      const targetInfos = targets.targetInfos ?? [];
      const cachedTargetId = chromeTabToTargetId.get(parsed.chrome_tab_id);

      const matched = findMatchingTarget(targetInfos, {
        targetId: parsed.target_id,
        cachedTargetId,
        url: parsed.url,
        title: parsed.title
      });
      if (!matched) {
        return {
          tab_id: "",
          status: "not_found"
        };
      }

      chromeTabToTargetId.set(parsed.chrome_tab_id, matched.targetId);

      const existing = options.sessionRegistry.listTabs().find((tab) => tab.targetId === matched.targetId);
      const resolvedTabId = existing?.tabId;

      if (resolvedTabId) {
        notifyIfChanged(resolvedTabId);
        return {
          tab_id: resolvedTabId,
          status: "ok"
        };
      }

      const attached = await options.sessionRegistry.attachTab(matched.targetId);
      await options.sessionRegistry.enableDomains(attached.tabId);
      await options.sessionRegistry.refreshFrameTree(attached.tabId);
      notifyIfChanged(attached.tabId);

      return {
        tab_id: attached.tabId,
        status: "ok"
      };
    }
  };
}
