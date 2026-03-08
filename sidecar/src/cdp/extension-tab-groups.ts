import { BrowserActionError } from "../../../src/cdp/browser-actions";
import type { ICdpTransport } from "../../../src/cdp/types";

interface TargetInfoLike {
  targetId: string;
  type?: string;
  url?: string;
  title?: string;
}

interface RuntimeEvaluateValue {
  ok?: boolean;
  code?: string;
  error?: string;
  chromeTabIds?: number[];
  groupId?: number;
  groupName?: string;
  url?: string;
  title?: string;
}

interface ChromeTargetDescriptor {
  tabId: string;
  targetId: string;
  chromeTabId?: number;
}

interface ResolvedTargetDescriptor extends ChromeTargetDescriptor {
  url?: string;
  title?: string;
}

interface GroupTabsOptions {
  groupName?: string;
  groupColor?: string;
}

interface GroupTabsResult {
  tabIds: string[];
  chromeTabIds: number[];
  groupId: number;
  groupName: string;
}

interface UngroupTabsResult {
  tabIds: string[];
  chromeTabIds: number[];
}

interface NavigateSensitiveTabResult {
  tabId: string;
  chromeTabId: number;
  url: string;
  title?: string;
}

function chooseExtensionTarget(targetInfos: TargetInfoLike[]): TargetInfoLike | undefined {
  return (
    targetInfos.find((target) => target.type === "service_worker" && typeof target.url === "string" && target.url.endsWith("/background.js")) ??
    targetInfos.find((target) => target.type === "page" && typeof target.url === "string" && target.url.endsWith("/panel.html")) ??
    targetInfos.find((target) => typeof target.url === "string" && target.url.startsWith("chrome-extension://"))
  );
}

function resolveTargetDescriptors(
  targetInfos: TargetInfoLike[],
  targets: ChromeTargetDescriptor[]
): ResolvedTargetDescriptor[] {
  return targets.map((target) => {
    const targetInfo = targetInfos.find((candidate) => candidate.targetId === target.targetId);
    if (!targetInfo && typeof target.chromeTabId !== "number") {
      throw new BrowserActionError("TAB_NOT_FOUND", `Missing target metadata for ${target.tabId}`, false, {
        tab_id: target.tabId,
        target_id: target.targetId
      });
    }

    return {
      ...target,
      url: typeof targetInfo?.url === "string" && targetInfo.url.trim().length > 0 ? targetInfo.url : undefined,
      title: typeof targetInfo?.title === "string" && targetInfo.title.trim().length > 0 ? targetInfo.title : undefined
    };
  });
}

function buildRuntimeExpression(
  operation: "group" | "ungroup" | "navigate",
  descriptors: ResolvedTargetDescriptor[],
  options?: GroupTabsOptions & { url?: string }
): string {
  const payload = JSON.stringify({
    operation,
    descriptors,
    groupName: options?.groupName ?? "Atlas",
    groupColor: options?.groupColor,
    url: options?.url
  });

  return `(
    async () => {
      const payload = ${payload};
      const tabs = await chrome.tabs.query({});
      const resolveTabUrl = (tab) => {
        if (!tab) return "";
        if (typeof tab.pendingUrl === "string" && tab.pendingUrl.length > 0) return tab.pendingUrl;
        return typeof tab.url === "string" ? tab.url : "";
      };

      const matchedIds = [];
      for (const descriptor of payload.descriptors) {
        if (typeof descriptor.chromeTabId === "number") {
          const directMatch = tabs.find((tab) => tab.id === descriptor.chromeTabId);
          if (!directMatch || typeof directMatch.id !== "number") {
            return {
              ok: false,
              code: "TAB_GROUPING_TARGET_MISSING",
              error: "No Chrome tab matched id " + descriptor.chromeTabId
            };
          }
          matchedIds.push(directMatch.id);
          continue;
        }

        const candidates = tabs.filter((tab) => {
          if (typeof tab.id !== "number") return false;
          if (typeof descriptor.url !== "string" || descriptor.url.length === 0) return false;
          if (resolveTabUrl(tab) !== descriptor.url) return false;
          if (descriptor.title && typeof tab.title === "string" && tab.title.length > 0) {
            return tab.title === descriptor.title;
          }
          return true;
        });

        if (candidates.length === 0) {
          return {
            ok: false,
            code: "TAB_GROUPING_TARGET_MISSING",
            error: \`No Chrome tab matched \${descriptor.url}\`
          };
        }

        if (candidates.length > 1) {
          return {
            ok: false,
            code: "TAB_GROUPING_AMBIGUOUS",
            error: \`Matched multiple Chrome tabs for \${descriptor.url}\`
          };
        }

        matchedIds.push(candidates[0].id);
      }

      if (payload.operation === "navigate") {
        const targetUrl = typeof payload.url === 'string' ? payload.url : '';
        const updatedTab = await chrome.tabs.update(matchedIds[0], { url: targetUrl });
        const resolvedUrl = resolveTabUrl(updatedTab) || targetUrl;
        return {
          ok: true,
          chromeTabIds: [updatedTab.id],
          url: resolvedUrl,
          title: typeof updatedTab.title === "string" ? updatedTab.title : ""
        };
      }

      if (payload.operation === "ungroup") {
        const groupedIds = matchedIds.filter((tabId) => {
          const tab = tabs.find((candidate) => candidate.id === tabId);
          return typeof tab?.groupId === "number" && tab.groupId >= 0;
        });

        if (groupedIds.length > 0) {
          await chrome.tabs.ungroup(groupedIds);
        }

        return {
          ok: true,
          chromeTabIds: matchedIds
        };
      }

      const groupId = await chrome.tabs.group({ tabIds: matchedIds });
      await chrome.tabGroups.update(groupId, {
        title: payload.groupName,
        ...(payload.groupColor ? { color: payload.groupColor } : {})
      });

      return {
        ok: true,
        chromeTabIds: matchedIds,
        groupId,
        groupName: payload.groupName
      };
    }
  )()`;
}

async function withExtensionContext<T>(
  transport: ICdpTransport,
  targets: ChromeTargetDescriptor[],
  operation: "group" | "ungroup" | "navigate",
  options?: GroupTabsOptions
): Promise<T> {
  const targetInfoResult = await transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
  const targetInfos = targetInfoResult.targetInfos ?? [];
  const extensionTarget = chooseExtensionTarget(targetInfos);
  if (!extensionTarget) {
    throw new BrowserActionError("TAB_GROUPING_UNAVAILABLE", "Assistant extension target is not available", false);
  }

  const descriptors = resolveTargetDescriptors(targetInfos, targets);
  const attached = await transport.send<{ sessionId: string }>("Target.attachToTarget", {
    targetId: extensionTarget.targetId,
    flatten: true
  });

  try {
    const evaluation = await transport.send<{ result?: { value?: RuntimeEvaluateValue } }>(
      "Runtime.evaluate",
      {
        expression: buildRuntimeExpression(operation, descriptors, options),
        awaitPromise: true,
        returnByValue: true
      },
      attached.sessionId
    );
    const value = evaluation.result?.value;
    if (!value?.ok) {
      throw new BrowserActionError(
        value?.code ?? "TAB_GROUPING_FAILED",
        value?.error ?? "Tab grouping failed in the extension context",
        false
      );
    }
    return value as T;
  } finally {
    try {
      await transport.send("Target.detachFromTarget", { sessionId: attached.sessionId });
    } catch {
      // Best effort cleanup only.
    }
  }
}

export async function groupTabsViaExtensionContext(
  transport: ICdpTransport,
  targets: ChromeTargetDescriptor[],
  options?: GroupTabsOptions
): Promise<GroupTabsResult> {
  const value = await withExtensionContext<RuntimeEvaluateValue>(transport, targets, "group", options);
  return {
    tabIds: targets.map((target) => target.tabId),
    chromeTabIds: value.chromeTabIds ?? [],
    groupId: value.groupId ?? -1,
    groupName: value.groupName ?? options?.groupName ?? "Atlas"
  };
}

export async function ungroupTabsViaExtensionContext(
  transport: ICdpTransport,
  targets: ChromeTargetDescriptor[]
): Promise<UngroupTabsResult> {
  const value = await withExtensionContext<RuntimeEvaluateValue>(transport, targets, "ungroup");
  return {
    tabIds: targets.map((target) => target.tabId),
    chromeTabIds: value.chromeTabIds ?? []
  };
}

export async function navigateSensitiveTabViaExtensionContext(
  transport: ICdpTransport,
  target: ChromeTargetDescriptor,
  url: string
): Promise<NavigateSensitiveTabResult> {
  const value = await withExtensionContext<RuntimeEvaluateValue>(transport, [target], "navigate", { url });
  return {
    tabId: target.tabId,
    chromeTabId: value.chromeTabIds?.[0] ?? -1,
    url: value.url ?? url,
    title: typeof value.title === "string" && value.title.trim().length > 0 ? value.title : undefined
  };
}
