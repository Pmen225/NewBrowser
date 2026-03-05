chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

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

  // Screenshot capture
  if (message.action === "captureScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
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
