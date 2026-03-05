import {
  CHAT_SESSIONS_STORAGE_KEY,
  normalizeChatSessionsStore
} from "./lib/recent-chats.js";
import {
  loadPanelSettings,
  normalizePanelSettings,
  PANEL_SETTINGS_STORAGE_KEY,
  savePanelSettings
} from "./lib/panel-settings.js";
import { isDictationSupported, isNarrationSupported } from "./lib/speech.js";
import {
  readUnlockedProviders,
  rememberUnlockedProviderSession,
  forgetUnlockedProviderSession,
  PROVIDER_SESSION_STORAGE_KEY
} from "./lib/provider-session.js";
import {
  MODEL_CONFIG_STORAGE_KEY,
  normalizeModelConfig
} from "./lib/model-config.js";

const narrationToggle = document.getElementById("narration-toggle");
const transcriptionToggle = document.getElementById("transcription-toggle");
const supportLine = document.getElementById("audio-support");
const clearChatsButton = document.getElementById("clear-chats-btn");
const chatList = document.getElementById("chat-list");
const providerIdInput = document.getElementById("provider-id-input");
const providerKeyInput = document.getElementById("provider-key-input");
const providerBaseUrlInput = document.getElementById("provider-base-url-input");
const providerModelInput = document.getElementById("provider-model-input");
const providerSaveButton = document.getElementById("provider-save-btn");
const providerSaveStatus = document.getElementById("provider-save-status");
const providerList = document.getElementById("provider-list");

const modelModeSelect = document.getElementById("model-mode-select");
const thinkingLevelSelect = document.getElementById("thinking-level-select");
const functionCallingToggle = document.getElementById("function-calling-toggle");
const browserSearchToggle = document.getElementById("browser-search-toggle");
const codeExecutionToggle = document.getElementById("code-execution-toggle");
const modelConfigSaveButton = document.getElementById("model-config-save-btn");
const modelConfigStatus = document.getElementById("model-config-status");

function normalizeProviderId(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function maskKey(key) {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••" + key.slice(-3);
}

function readUnlockedProvidersFromLocalStorage() {
  if (typeof globalThis.localStorage !== "object" || globalThis.localStorage === null) {
    return [];
  }
  const raw = globalThis.localStorage.getItem(PROVIDER_SESSION_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return [];
    }
    const normalized = [];
    for (const entry of Object.values(parsed)) {
      const provider = normalizeProviderId(entry?.provider);
      const apiKey = typeof entry?.apiKey === "string" ? entry.apiKey.trim() : "";
      if (!provider || !apiKey) {
        continue;
      }
      normalized.push({
        provider,
        apiKey,
        baseUrl: typeof entry?.baseUrl === "string" ? entry.baseUrl.trim() : "",
        preferredModel: typeof entry?.preferredModel === "string" ? entry.preferredModel.trim() : "",
        unlockedAt: typeof entry?.unlockedAt === "string" ? entry.unlockedAt : new Date().toISOString()
      });
    }
    return normalized;
  } catch {
    return [];
  }
}

function formatTimestamp(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

async function loadChats() {
  if (!globalThis.chrome?.storage?.local) {
    return { sessions: [], activeSessionId: null };
  }
  const result = await chrome.storage.local.get(CHAT_SESSIONS_STORAGE_KEY);
  return normalizeChatSessionsStore(result[CHAT_SESSIONS_STORAGE_KEY]);
}

async function clearChats() {
  if (!globalThis.chrome?.storage?.local) {
    return;
  }
  await chrome.storage.local.remove(CHAT_SESSIONS_STORAGE_KEY);
}

function renderChats(store) {
  const sessions = store.sessions.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  chatList.replaceChildren();
  if (sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-hint";
    empty.textContent = "No chats saved yet.";
    chatList.append(empty);
    return;
  }

  for (const session of sessions) {
    const item = document.createElement("div");
    item.className = "settings-chat-item";
    const title = document.createElement("div");
    title.className = "settings-chat-title";
    title.textContent = session.title || "Untitled chat";
    const meta = document.createElement("div");
    meta.className = "settings-chat-meta";
    meta.textContent = formatTimestamp(session.updatedAt);
    item.append(title, meta);
    chatList.append(item);
  }
}

async function loadProviders() {
  const providers = await readUnlockedProviders();
  if (Array.isArray(providers) && providers.length > 0) {
    return providers;
  }
  return readUnlockedProvidersFromLocalStorage();
}

function renderProviders(list) {
  providerList.replaceChildren();
  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-hint";
    empty.textContent = "No provider keys saved yet.";
    providerList.append(empty);
    return;
  }

  for (const entry of list) {
    const row = document.createElement("div");
    row.className = "provider-row";

    const left = document.createElement("div");
    left.className = "provider-copy";
    const title = document.createElement("div");
    title.className = "provider-title";
    title.textContent = entry.provider || "(unknown)";
    const meta = document.createElement("div");
    meta.className = "provider-meta";
    const parts = [];
    if (entry.apiKey) parts.push(maskKey(entry.apiKey));
    if (entry.preferredModel) parts.push(entry.preferredModel);
    if (entry.baseUrl) parts.push(entry.baseUrl);
    meta.textContent = parts.join(" · ") || "No details";
    left.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "provider-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "settings-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      providerIdInput.value = entry.provider;
      providerKeyInput.value = "";
      providerKeyInput.placeholder = maskKey(entry.apiKey) + " (enter new key to change)";
      providerModelInput.value = entry.preferredModel || "";
      providerBaseUrlInput.value = entry.baseUrl || "";
      providerIdInput.scrollIntoView({ behavior: "smooth", block: "center" });
      providerKeyInput.focus();
    });
    actions.append(edit);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "settings-button settings-button--danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await forgetUnlockedProviderSession(entry.provider);
      renderProviders(await loadProviders());
    });
    actions.append(remove);

    row.append(left, actions);
    providerList.append(row);
  }
}

function showStatus(el, message, isError = false) {
  el.textContent = message;
  el.dataset.status = isError ? "error" : "ok";
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3000);
}

function renderSupportLine() {
  const narrationOk = isNarrationSupported();
  const dictationOk = isDictationSupported();
  supportLine.textContent = `Narration: ${narrationOk ? "supported" : "unavailable"} · Dictation: ${dictationOk ? "supported" : "unavailable"}`;
}

async function loadModelConfig() {
  if (!globalThis.chrome?.storage?.local) {
    return normalizeModelConfig({});
  }
  const result = await chrome.storage.local.get(MODEL_CONFIG_STORAGE_KEY);
  return normalizeModelConfig(result[MODEL_CONFIG_STORAGE_KEY]);
}

function applyModelConfigToForm(config) {
  if (modelModeSelect) modelModeSelect.value = config.defaultModelMode || "auto";
  if (thinkingLevelSelect) thinkingLevelSelect.value = config.thinkingLevel || "low";
  if (functionCallingToggle) functionCallingToggle.checked = config.enableFunctionCalling !== false;
  if (browserSearchToggle) browserSearchToggle.checked = config.allowBrowserSearch !== false;
  if (codeExecutionToggle) codeExecutionToggle.checked = config.enableCodeExecution !== false;
}

async function saveModelConfigFromForm() {
  const config = normalizeModelConfig({
    defaultModelMode: modelModeSelect?.value || "auto",
    thinkingLevel: thinkingLevelSelect?.value || "low",
    enableFunctionCalling: functionCallingToggle?.checked !== false,
    allowBrowserSearch: browserSearchToggle?.checked !== false,
    enableCodeExecution: codeExecutionToggle?.checked !== false,

  });
  if (globalThis.chrome?.storage?.local?.set) {
    await chrome.storage.local.set({ [MODEL_CONFIG_STORAGE_KEY]: config });
  }
  return config;
}

async function main() {
  renderSupportLine();

  // Parallelize all storage reads for faster settings page load
  const [rawSettings, store, providers, modelConfig] = await Promise.all([
    loadPanelSettings(),
    loadChats(),
    loadProviders(),
    loadModelConfig()
  ]);

  let currentSettings = normalizePanelSettings(rawSettings);
  narrationToggle.checked = currentSettings.narrationEnabled;
  transcriptionToggle.checked = currentSettings.transcriptionEnabled;

  narrationToggle.addEventListener("change", async () => {
    currentSettings = await savePanelSettings({
      ...currentSettings,
      narrationEnabled: narrationToggle.checked
    });
  });

  transcriptionToggle.addEventListener("change", async () => {
    currentSettings = await savePanelSettings({
      ...currentSettings,
      transcriptionEnabled: transcriptionToggle.checked
    });
  });

  renderChats(store);
  renderProviders(providers);

  // Pre-fill form with first saved provider (convenience)
  if (providers.length > 0) {
    const first = providers[0];
    providerIdInput.value = first.provider;
    providerModelInput.value = first.preferredModel || "";
    providerKeyInput.placeholder = maskKey(first.apiKey) + " (enter new key to change)";
  }

  applyModelConfigToForm(modelConfig);

  providerSaveButton.addEventListener("click", async () => {
    const provider = normalizeProviderId(providerIdInput.value);
    const rawKey = providerKeyInput.value.trim();
    const baseUrl = providerBaseUrlInput.value.trim();
    const preferredModel = providerModelInput.value.trim();
    if (!provider) {
      showStatus(providerSaveStatus, "Provider ID is required.", true);
      return;
    }

    // If key field is empty, keep existing key for this provider
    let apiKey = rawKey;
    let current = null;
    if (!apiKey) {
      current = await loadProviders();
      const existing = current.find(p => p.provider === provider);
      if (existing) {
        apiKey = existing.apiKey;
      } else {
        showStatus(providerSaveStatus, "API key is required.", true);
        return;
      }
    }

    await rememberUnlockedProviderSession({ provider, apiKey, baseUrl, preferredModel });
    // Reuse already-loaded list or fetch once
    const updated = current ?? await loadProviders();
    const next = updated.filter(p => p.provider !== provider).concat({ provider, apiKey, baseUrl, preferredModel, unlockedAt: new Date().toISOString() });
    renderProviders(next);
    providerKeyInput.value = "";
    providerKeyInput.placeholder = maskKey(apiKey) + " (enter new key to change)";
    showStatus(providerSaveStatus, `✓ ${provider} key saved.`);
  });

  modelConfigSaveButton.addEventListener("click", async () => {
    await saveModelConfigFromForm();
    showStatus(modelConfigStatus, "✓ Model settings saved.");
  });

  clearChatsButton.addEventListener("click", async () => {
    await clearChats();
    renderChats({ sessions: [], activeSessionId: null });
  });

  if (globalThis.chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[PANEL_SETTINGS_STORAGE_KEY]) {
        const next = normalizePanelSettings(changes[PANEL_SETTINGS_STORAGE_KEY].newValue);
        currentSettings = next;
        narrationToggle.checked = next.narrationEnabled;
        transcriptionToggle.checked = next.transcriptionEnabled;
      }
      if (changes[CHAT_SESSIONS_STORAGE_KEY]) {
        renderChats(normalizeChatSessionsStore(changes[CHAT_SESSIONS_STORAGE_KEY].newValue));
      }
      if (changes[PROVIDER_SESSION_STORAGE_KEY]) {
        const map = changes[PROVIDER_SESSION_STORAGE_KEY].newValue || {};
        renderProviders(Object.values(map));
      }
      if (changes[MODEL_CONFIG_STORAGE_KEY]) {
        applyModelConfigToForm(normalizeModelConfig(changes[MODEL_CONFIG_STORAGE_KEY].newValue));
      }
    });
  }
}

main();
