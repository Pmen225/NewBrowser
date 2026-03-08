const statusEl = document.getElementById("status");
const recheckButton = document.getElementById("recheck-btn");
const dismissButton = document.getElementById("dismiss-btn");

async function isAssistantPinned() {
  if (typeof chrome.action?.getUserSettings !== "function") {
    return true;
  }

  try {
    const settings = await chrome.action.getUserSettings();
    return settings?.isOnToolbar !== false;
  } catch {
    return false;
  }
}

async function syncPinnedState() {
  const pinned = await isAssistantPinned();
  if (pinned) {
    statusEl.textContent = "Assistant is pinned. Closing this helper...";
    globalThis.setTimeout(() => {
      globalThis.close();
    }, 300);
    return true;
  }

  statusEl.textContent = "Waiting for Assistant to be pinned...";
  return false;
}

recheckButton?.addEventListener("click", () => {
  void syncPinnedState();
});

dismissButton?.addEventListener("click", () => {
  globalThis.close();
});

chrome.action.onUserSettingsChanged?.addListener(() => {
  void syncPinnedState();
});

void syncPinnedState();
globalThis.setInterval(() => {
  void syncPinnedState();
}, 1000);
