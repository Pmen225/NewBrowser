chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const insertContexts = new Map();
const benchmarkWorkspaces = new Map();
const BENCHMARK_URL_MARKER = "atlas-benchmark=";

function cloneTargetSnapshot(target) {
  if (!target) return undefined;
  return {
    targetId: target.targetId,
    role: target.role,
    frameId: target.frameId,
    tagName: target.tagName,
    inputType: target.inputType,
    isContentEditable: target.isContentEditable,
    label: target.label,
    placeholder: target.placeholder,
    canInsertHtml: target.canInsertHtml,
    updatedAt: target.updatedAt
  };
}

function cloneInsertContext(context) {
  if (!context) {
    return {
      updatedAt: Date.now(),
      stale: true
    };
  }

  return {
    subject: cloneTargetSnapshot(context.subject),
    body: cloneTargetSnapshot(context.body),
    updatedAt: context.updatedAt,
    stale: context.stale === true
  };
}

function upsertInsertContext(tabId, frameId, role, target) {
  const current = insertContexts.get(tabId) ?? {
    subject: undefined,
    body: undefined,
    updatedAt: Date.now(),
    stale: false
  };

  if (role !== "subject" && role !== "body") {
    return cloneInsertContext(current);
  }

  if (target && typeof target.targetId === "string") {
    current[role] = {
      ...target,
      role,
      frameId,
      updatedAt: typeof target.updatedAt === "number" ? target.updatedAt : Date.now()
    };
    current.stale = false;
  } else {
    delete current[role];
    current.stale = !current.subject && !current.body;
  }

  current.updatedAt = Date.now();
  insertContexts.set(tabId, current);
  return cloneInsertContext(current);
}

function clearInsertTarget(tabId, role) {
  const current = insertContexts.get(tabId);
  if (!current) return;

  if (role === "subject" || role === "body") {
    delete current[role];
  }

  current.updatedAt = Date.now();
  current.stale = !current.subject && !current.body;

  if (current.stale) {
    insertContexts.delete(tabId);
    return;
  }

  insertContexts.set(tabId, current);
}

function notifyInsertContextChanged(tabId, context) {
  chrome.runtime.sendMessage({
    type: "ATLAS_INSERT_CONTEXT_CHANGED",
    tabId,
    context
  }).catch(() => {});
}

async function applyDraftToRole(tabId, role, target, artifact) {
  if (!target?.targetId) {
    return { ok: false, role, error: "no_target" };
  }

  try {
    const response = await chrome.tabs.sendMessage(
      tabId,
      {
        type: "ATLAS_INSERT_DRAFT",
        role,
        targetId: target.targetId,
        artifact
      },
      typeof target.frameId === "number" ? { frameId: target.frameId } : undefined
    );
    if (response?.error === "stale_target") {
      clearInsertTarget(tabId, role);
    }
    return response ?? { ok: false, role, error: "insertion_failed" };
  } catch {
    clearInsertTarget(tabId, role);
    return { ok: false, role, error: "stale_target" };
  }
}

function cloneBenchmarkWorkspaceState(workspace) {
  if (!workspace) {
    return null;
  }

  return {
    benchmarkId: workspace.benchmarkId,
    title: workspace.title,
    tabIds: [...workspace.tabIds],
    groupId: typeof workspace.groupId === "number" ? workspace.groupId : null,
    updatedAt: workspace.updatedAt
  };
}

function resolveTabUrl(tab) {
  return tab?.pendingUrl || tab?.url || "";
}

function isBenchmarkTaggedTab(tab) {
  return resolveTabUrl(tab).includes(BENCHMARK_URL_MARKER);
}

async function resolveTabsForUrls(urls) {
  const expectedUrls = new Set(
    Array.isArray(urls)
      ? urls.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
      : []
  );

  if (expectedUrls.size === 0) {
    return [];
  }

  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => expectedUrls.has(resolveTabUrl(tab)) && typeof tab.id === "number");
}

async function closeTabsByIds(tabIds) {
  const uniqueTabIds = [...new Set(tabIds.filter((tabId) => typeof tabId === "number"))];
  if (uniqueTabIds.length === 0) {
    return;
  }

  try {
    await chrome.tabs.remove(uniqueTabIds);
  } catch {
    // Best-effort cleanup; benchmark runner has a CDP fallback.
  }
}

async function sweepStaleBenchmarkTabs(allowedUrls) {
  const allowed = new Set(
    Array.isArray(allowedUrls)
      ? allowedUrls.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
      : []
  );
  const tabs = await chrome.tabs.query({});
  const staleTabIds = tabs
    .filter((tab) => isBenchmarkTaggedTab(tab) && !allowed.has(resolveTabUrl(tab)))
    .map((tab) => tab.id);
  await closeTabsByIds(staleTabIds);
}

async function closeBenchmarkTabsById(benchmarkId, trackedTabIds = []) {
  const tabs = await chrome.tabs.query({});
  const matchingTabIds = tabs
    .filter((tab) => resolveTabUrl(tab).includes(`atlas-benchmark=${benchmarkId}`))
    .map((tab) => tab.id);
  await closeTabsByIds([...trackedTabIds, ...matchingTabIds]);
}

async function registerBenchmarkWorkspace(benchmarkId, title, tabUrls) {
  await sweepStaleBenchmarkTabs(tabUrls);
  const matchedTabs = await resolveTabsForUrls(tabUrls);
  const nextTabIds = matchedTabs.map((tab) => tab.id).filter((tabId) => typeof tabId === "number");
  const previous = benchmarkWorkspaces.get(benchmarkId) ?? {
    benchmarkId,
    title,
    tabIds: new Set(),
    groupId: undefined,
    updatedAt: 0
  };

  for (const tabId of nextTabIds) {
    previous.tabIds.add(tabId);
  }
  previous.title = title;
  previous.updatedAt = Date.now();

  const tabIds = [...previous.tabIds];
  if (tabIds.length > 0) {
    try {
      const groupId = typeof previous.groupId === "number"
        ? await chrome.tabs.group({ groupId: previous.groupId, tabIds })
        : await chrome.tabs.group({ tabIds });
      previous.groupId = groupId;
      await chrome.tabGroups.update(groupId, {
        title,
        color: "blue",
        collapsed: false
      });
    } catch {
      previous.groupId = undefined;
    }
  }

  benchmarkWorkspaces.set(benchmarkId, previous);
  return {
    ok: true,
    workspace: cloneBenchmarkWorkspaceState(previous),
    matched_count: nextTabIds.length
  };
}

async function finalizeBenchmarkWorkspace(benchmarkId, closeTabs) {
  const workspace = benchmarkWorkspaces.get(benchmarkId);
  benchmarkWorkspaces.delete(benchmarkId);
  if (closeTabs === true) {
    await closeBenchmarkTabsById(benchmarkId, workspace ? [...workspace.tabIds] : []);
  }
  return {
    ok: true,
    workspace: cloneBenchmarkWorkspaceState(workspace)
  };
}

function scheduleBenchmarkFinalize(benchmarkId, closeTabs) {
  setTimeout(async () => {
    await finalizeBenchmarkWorkspace(benchmarkId, closeTabs);
  }, 0);
}

globalThis.__ATLAS_BENCHMARK_API = {
  register: registerBenchmarkWorkspace,
  finalize: finalizeBenchmarkWorkspace
};

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number") return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Floating page button → open side panel for that tab
  if (message.action === "openSidePanel" && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    return;
  }

  // Screenshot capture — resolve the last focused window explicitly so the
  // service worker has a concrete windowId (null silently fails in SW context).
  if (message.action === "captureScreenshot") {
    chrome.windows.getLastFocused({ windowTypes: ["normal"] }, (win) => {
      const windowId = win?.id ?? chrome.windows.WINDOW_ID_CURRENT;
      chrome.tabs.captureVisibleTab(windowId, { format: "png", quality: 92 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (!dataUrl) {
          sendResponse({ error: "captureVisibleTab returned empty" });
        } else {
          sendResponse({ dataUrl });
        }
      });
    });
    return true;
  }

  if (message.type === "ATLAS_INSERT_CONTEXT_UPDATE" && sender.tab?.id) {
    const nextContext = upsertInsertContext(
      sender.tab.id,
      sender.frameId ?? 0,
      typeof message.role === "string" ? message.role : "",
      typeof message.target === "object" && message.target ? message.target : undefined
    );
    notifyInsertContextChanged(sender.tab.id, nextContext);
    sendResponse({ ok: true, context: nextContext });
    return true;
  }

  if (message.type === "ATLAS_GET_INSERT_CONTEXT") {
    const tabId = typeof message.tabId === "number" ? message.tabId : sender.tab?.id;
    sendResponse({
      ok: true,
      context: tabId ? cloneInsertContext(insertContexts.get(tabId)) : cloneInsertContext(undefined)
    });
    return true;
  }

  if (message.type === "ATLAS_INSERT_DRAFT" && typeof message.tabId === "number") {
    void (async () => {
      const context = insertContexts.get(message.tabId);
      if (!context?.subject && !context?.body) {
        sendResponse({
          ok: false,
          inserted: [],
          error: "no_target",
          message: "Focus a subject or body field on the page first.",
          context: cloneInsertContext(context)
        });
        return;
      }

      const inserted = [];
      const subjectResult = context.subject
        ? await applyDraftToRole(message.tabId, "subject", context.subject, message.artifact)
        : null;
      if (subjectResult?.ok) inserted.push("subject");

      const bodyResult = context.body
        ? await applyDraftToRole(message.tabId, "body", context.body, message.artifact)
        : null;
      if (bodyResult?.ok) inserted.push("body");

      const nextContext = cloneInsertContext(insertContexts.get(message.tabId));
      notifyInsertContextChanged(message.tabId, nextContext);

      sendResponse({
        ok: inserted.length > 0,
        inserted,
        error: inserted.length > 0 ? undefined : (bodyResult?.error ?? subjectResult?.error ?? "insertion_failed"),
        message:
          inserted.length > 0
            ? undefined
            : "Could not insert into the current page fields. Refocus the editor and try again.",
        context: nextContext
      });
    })();
    return true;
  }

  if (message.type === "ATLAS_BENCHMARK_REGISTER") {
    void (async () => {
      const benchmarkId = typeof message.benchmarkId === "string" ? message.benchmarkId.trim() : "";
      const title = typeof message.title === "string" && message.title.trim().length > 0
        ? message.title.trim()
        : "Atlas benchmark";
      if (!benchmarkId) {
        sendResponse({ ok: false, error: "invalid_benchmark_id" });
        return;
      }

      const result = await registerBenchmarkWorkspace(benchmarkId, title, message.tabUrls);
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === "ATLAS_BENCHMARK_FINALIZE") {
    const benchmarkId = typeof message.benchmarkId === "string" ? message.benchmarkId.trim() : "";
    if (!benchmarkId) {
      sendResponse({ ok: false, error: "invalid_benchmark_id" });
      return true;
    }

    sendResponse(cloneBenchmarkWorkspaceState(benchmarkWorkspaces.get(benchmarkId))
      ? { ok: true, workspace: cloneBenchmarkWorkspaceState(benchmarkWorkspaces.get(benchmarkId)) }
      : { ok: true, workspace: null });
    scheduleBenchmarkFinalize(benchmarkId, message.closeTabs === true);
    return true;
  }

  // Agent overlay: inject content script into target tab
  if (message.type === "ATLAS_OVERLAY_START" && typeof message.tabId === "number") {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ["content/agent-overlay.js"],
    }).then(async () => {
      try {
        const tab = await chrome.tabs.get(message.tabId);
        chrome.tabs.sendMessage(message.tabId, {
          type: "ATLAS_SITE_INFO",
          favicon: tab?.favIconUrl ?? "",
          title: tab?.title ?? "",
          url: tab?.url ?? "",
        }).catch(() => {});
      } catch (_) {
        // Optional metadata only; overlay still works if this fails.
      }
    }).catch(() => {});
    return;
  }

  // Forward overlay messages from panel to tab
  if (
    (message.type === "ATLAS_OVERLAY_STOP" ||
     message.type === "ATLAS_CURSOR" ||
     message.type === "ATLAS_STATUS_UPDATE" ||
     message.type === "ATLAS_CONTROL_STATE" ||
     message.type === "ATLAS_CLICK" ||
     message.type === "ATLAS_HIGHLIGHT" ||
     message.type === "ATLAS_SITE_INFO") &&
    typeof message.tabId === "number"
  ) {
    chrome.tabs.sendMessage(message.tabId, message).catch(() => {});
    return;
  }

  // Control messages from page bar — re-broadcast so panel receives
  if (message.type === "ATLAS_CONTROL" && typeof message.action === "string") {
    chrome.runtime.sendMessage(message).catch(() => {});
    return;
  }
});
