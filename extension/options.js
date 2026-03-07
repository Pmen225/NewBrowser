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
import {
  MEMORY_STORE_STORAGE_KEY,
  buildMemoryViewModel,
  deleteManualMemory,
  hideDerivedMemory,
  loadMemoryStore,
  saveMemoryStore,
  upsertManualMemory
} from "./lib/memory.js";
import { isAudioRecordingSupported, isNarrationSupported } from "./lib/speech.js";
import {
  readUnlockedProviders,
  rememberUnlockedProviderSession,
  forgetUnlockedProviderSession,
  PROVIDER_SESSION_STORAGE_KEY
} from "./lib/provider-session.js";
import {
  MODEL_CONFIG_STORAGE_KEY,
  MODEL_CATALOG_STORAGE_KEY,
  MODEL_BENCHMARK_STORAGE_KEY,
  AGENT_CONFIG_STORAGE_KEY,
  normalizeModelConfig,
  normalizeAgentConfig,
  normalizeModelCatalog,
  normalizeModelBenchmarkManifest,
  upsertManualModel,
  deleteManualModel,
  syncModelCatalogs,
  getModelBenchmarkEntry,
  recordModelBenchmarkResult,
  isBrowserControlBenchmarkCandidate
} from "./lib/model-config.js";
import {
  SHORTCUTS_STORAGE_KEY,
  normalizeShortcuts,
  upsertShortcut,
  deleteShortcut
} from "./lib/shortcuts.js";

// ─── Element refs ────────────────────────────────────────────────────────────

// Agent
const agentMaxSteps       = document.getElementById("agent-max-steps");
const agentMaxActions     = document.getElementById("agent-max-actions");
const agentFailureTol     = document.getElementById("agent-failure-tolerance");
const agentVisionToggle   = document.getElementById("agent-vision-toggle");
const agentHighlightsTog  = document.getElementById("agent-highlights-toggle");
const agentReplanFreq     = document.getElementById("agent-replan-freq");
const agentPageLoadWait   = document.getElementById("agent-page-load-wait");
const agentReplayToggle   = document.getElementById("agent-replay-toggle");
const agentSaveDot        = document.getElementById("agent-save-dot");

// Provider
const providerIdInput     = document.getElementById("provider-id-input");
const providerKeyInput    = document.getElementById("provider-key-input");
const providerBaseUrlInput= document.getElementById("provider-base-url-input");
const providerModelInput  = document.getElementById("provider-model-input");
const providerSaveBtn     = document.getElementById("provider-save-btn");
const providerSaveStatus  = document.getElementById("provider-save-status");
const providerList        = document.getElementById("provider-list");

// Models
const modelsSyncBtn       = document.getElementById("models-sync-btn");
const modelsAddBtn        = document.getElementById("models-add-btn");
const modelsAddForm       = document.getElementById("models-add-form");
const manualModelProvider = document.getElementById("manual-model-provider");
const manualModelId       = document.getElementById("manual-model-id");
const manualModelName     = document.getElementById("manual-model-name");
const manualModelCancel   = document.getElementById("manual-model-cancel");
const manualModelSave     = document.getElementById("manual-model-save");
const modelsSyncStatus    = document.getElementById("models-sync-status");
const modelsList          = document.getElementById("models-list");

// Model config
const modelModeSelect     = document.getElementById("model-mode-select");
const thinkingLevelSelect = document.getElementById("thinking-level-select");
const functionCallingTog  = document.getElementById("function-calling-toggle");
const browserSearchTog    = document.getElementById("browser-search-toggle");
const codeExecutionTog    = document.getElementById("code-execution-toggle");
const modelSaveDot        = document.getElementById("model-save-dot");

// Audio
const narrationToggle     = document.getElementById("narration-toggle");
const transcriptionToggle = document.getElementById("transcription-toggle");
const transcriptionModelInput = document.getElementById("transcription-model-input");
const transcriptionLanguageInput = document.getElementById("transcription-language-input");
const audioSupport        = document.getElementById("audio-support");
const memoryManualToggle  = document.getElementById("memory-manual-toggle");
const memoryBookmarksToggle = document.getElementById("memory-bookmarks-toggle");
const memoryHistoryToggle = document.getElementById("memory-history-toggle");
const memorySettingsToggle = document.getElementById("memory-settings-toggle");
const memoryEntryId       = document.getElementById("memory-entry-id");
const memoryEntryText     = document.getElementById("memory-entry-text");
const memorySaveBtn       = document.getElementById("memory-save-btn");
const memoryCancelBtn     = document.getElementById("memory-cancel-btn");
const memoryStatus        = document.getElementById("memory-status");
const memoryManualList    = document.getElementById("memory-manual-list");
const memoryDerivedList   = document.getElementById("memory-derived-list");
const browserAdminToggle  = document.getElementById("browser-admin-toggle");
const extensionManagementToggle = document.getElementById("extension-management-toggle");

// Chats
const clearChatsBtn       = document.getElementById("clear-chats-btn");
const chatList            = document.getElementById("chat-list");

// Commands
const shortcutsAddBtn        = document.getElementById("shortcuts-add-btn");
const shortcutsForm          = document.getElementById("shortcuts-form");
const shortcutIdInput        = document.getElementById("shortcut-id");
const shortcutTriggerInput   = document.getElementById("shortcut-trigger");
const shortcutLabelInput     = document.getElementById("shortcut-label");
const shortcutInstructions   = document.getElementById("shortcut-instructions");
const shortcutsCancelBtn     = document.getElementById("shortcuts-cancel-btn");
const shortcutsSaveBtn       = document.getElementById("shortcuts-save-btn");
const shortcutsStatus        = document.getElementById("shortcuts-status");
const shortcutsList          = document.getElementById("shortcuts-list");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeProviderId(v) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

function maskKey(key) {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••" + key.slice(-3);
}

function formatTimestamp(v) {
  if (typeof v !== "string" || !v.trim()) return "";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function showStatus(el, message, type = "ok") {
  el.textContent = message;
  el.dataset.type = type;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; delete el.dataset.type; }, 3200);
}

function showSavedDot(el) {
  if (!el) return;
  // Re-trigger animation by forcing reflow
  el.hidden = false;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  clearTimeout(el._dotTimer);
  el._dotTimer = setTimeout(() => { el.hidden = true; }, 2000);
}

function readUnlockedProvidersFromLocalStorage() {
  if (typeof globalThis.localStorage !== "object" || !globalThis.localStorage) return [];
  const raw = globalThis.localStorage.getItem(PROVIDER_SESSION_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    return Object.values(parsed).reduce((acc, entry) => {
      const provider = normalizeProviderId(entry?.provider);
      const apiKey   = typeof entry?.apiKey === "string" ? entry.apiKey.trim() : "";
      if (!provider || !apiKey) return acc;
      acc.push({
        provider,
        apiKey,
        baseUrl:        typeof entry?.baseUrl        === "string" ? entry.baseUrl.trim()        : "",
        preferredModel: typeof entry?.preferredModel === "string" ? entry.preferredModel.trim() : "",
        unlockedAt:     typeof entry?.unlockedAt     === "string" ? entry.unlockedAt            : new Date().toISOString()
      });
      return acc;
    }, []);
  } catch { return []; }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function chromeGet(keys) {
  if (!globalThis.chrome?.storage?.local) return {};
  return chrome.storage.local.get(keys);
}

async function chromeSet(obj) {
  if (!globalThis.chrome?.storage?.local?.set) return;
  await chrome.storage.local.set(obj);
}

async function callSidecarRpc(action, params, { timeoutMs = 15 * 60 * 1000 } = {}) {
  const response = await fetch("http://127.0.0.1:3210/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: `options-${Date.now()}`,
      action,
      tab_id: "__system__",
      params
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const payload = await response.json();
  if (payload?.ok === true) return payload.result || {};

  const error = new Error(typeof payload?.error?.message === "string" ? payload.error.message : `RPC failed for ${action}`);
  error.code = typeof payload?.error?.code === "string" ? payload.error.code : "RPC_FAILED";
  throw error;
}

// ─── Agent config ─────────────────────────────────────────────────────────────

async function loadAgentConfig() {
  const result = await chromeGet(AGENT_CONFIG_STORAGE_KEY);
  return normalizeAgentConfig(result[AGENT_CONFIG_STORAGE_KEY]);
}

function applyAgentConfigToForm(cfg) {
  if (agentMaxSteps)       agentMaxSteps.value       = cfg.maxStepsPerTask;
  if (agentMaxActions)     agentMaxActions.value     = cfg.maxActionsPerStep;
  if (agentFailureTol)     agentFailureTol.value     = cfg.failureTolerance;
  if (agentVisionToggle)   agentVisionToggle.checked = cfg.enableVision;
  if (agentHighlightsTog)  agentHighlightsTog.checked= cfg.displayHighlights;
  if (agentReplanFreq)     agentReplanFreq.value     = cfg.replanningFrequency;
  if (agentPageLoadWait)   agentPageLoadWait.value   = cfg.pageLoadWaitTimeMs;
  if (agentReplayToggle)   agentReplayToggle.checked = cfg.replayHistoricalTasks;
}

function readAgentConfigFromForm() {
  return normalizeAgentConfig({
    maxStepsPerTask:       parseInt(agentMaxSteps?.value,       10) || 1000,
    maxActionsPerStep:     parseInt(agentMaxActions?.value,     10) || 1000,
    failureTolerance:      parseInt(agentFailureTol?.value,     10) || 10,
    enableVision:          agentVisionToggle?.checked   === true,
    displayHighlights:     agentHighlightsTog?.checked  !== false,
    replanningFrequency:   parseInt(agentReplanFreq?.value,     10) || 10,
    pageLoadWaitTimeMs:    parseInt(agentPageLoadWait?.value,   10) || 250,
    replayHistoricalTasks: agentReplayToggle?.checked   !== false
  });
}

// ─── Providers ────────────────────────────────────────────────────────────────

async function loadProviders() {
  const providers = await readUnlockedProviders();
  if (Array.isArray(providers) && providers.length > 0) return providers;
  return readUnlockedProvidersFromLocalStorage();
}

function renderProviders(list) {
  providerList.replaceChildren();
  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No provider keys saved yet.";
    providerList.append(empty);
    return;
  }

  list.forEach(entry => {
    const item = document.createElement("div");
    item.className = "settings-item";

    const copy = document.createElement("div");
    copy.className = "settings-item-copy";

    const title = document.createElement("div");
    title.className = "settings-item-title";
    title.textContent = entry.provider || "(unknown)";

    const meta = document.createElement("div");
    meta.className = "settings-item-meta";
    const parts = [];
    if (entry.apiKey)        parts.push(maskKey(entry.apiKey));
    if (entry.preferredModel) parts.push(entry.preferredModel);
    if (entry.baseUrl)       parts.push(entry.baseUrl);
    meta.textContent = parts.join(" · ") || "No details";

    copy.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "settings-item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "settings-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      providerIdInput.value    = entry.provider;
      providerKeyInput.value   = "";
      providerKeyInput.placeholder = maskKey(entry.apiKey) + " (enter new key to change)";
      providerModelInput.value = entry.preferredModel || "";
      providerBaseUrlInput.value = entry.baseUrl || "";
      providerIdInput.scrollIntoView({ behavior: "smooth", block: "center" });
      providerKeyInput.focus();
      document.getElementById("provider").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "settings-button settings-button--danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await forgetUnlockedProviderSession(entry.provider);
      renderProviders(await loadProviders());
    });

    actions.append(edit, remove);
    item.append(copy, actions);
    providerList.append(item);
  });
}

// ─── Model catalog ────────────────────────────────────────────────────────────

async function loadCatalog() {
  const result = await chromeGet(MODEL_CATALOG_STORAGE_KEY);
  return normalizeModelCatalog(result[MODEL_CATALOG_STORAGE_KEY]);
}

async function saveCatalog(catalog) {
  await chromeSet({ [MODEL_CATALOG_STORAGE_KEY]: catalog });
}

async function loadBenchmarkManifest() {
  const result = await chromeGet(MODEL_BENCHMARK_STORAGE_KEY);
  return normalizeModelBenchmarkManifest(result[MODEL_BENCHMARK_STORAGE_KEY]);
}

async function saveBenchmarkManifest(manifest) {
  await chromeSet({ [MODEL_BENCHMARK_STORAGE_KEY]: manifest });
}

const activeBenchmarks = new Set();

function capabilityTags(entry, benchmarkEntry) {
  const tags = [];
  if (entry.inputModalities?.includes("vision"))    tags.push({ label: "vision",   cls: "settings-tag--vision"   });
  if (entry.supportsFunctionCalling)                tags.push({ label: "tools",    cls: "settings-tag--tools"    });
  if (entry.supportsBrowserSearch)                  tags.push({ label: "search",   cls: "settings-tag--search"   });
  if (entry.supportsCodeExecution)                  tags.push({ label: "code",     cls: "settings-tag--code"     });
  if (entry.source === "manual")                    tags.push({ label: "manual",   cls: "settings-tag--manual"   });
  if (entry.costTier === "lowest" || entry.costTier === "low") tags.push({ label: "cheap", cls: "settings-tag--cheap" });
  if (entry.capabilityTier === "advanced")          tags.push({ label: "advanced", cls: "settings-tag--advanced" });
  if (benchmarkEntry?.status === "approved")        tags.push({ label: "approved", cls: "settings-tag--approved" });
  if (benchmarkEntry?.status === "experimental")    tags.push({ label: "experimental", cls: "settings-tag--experimental" });
  if (benchmarkEntry?.status === "blocked")         tags.push({ label: "blocked", cls: "settings-tag--blocked" });
  return tags;
}

function formatBenchmarkMeta(entry, benchmarkEntry) {
  if (!benchmarkEntry?.benchmark) {
    return isBrowserControlBenchmarkCandidate(entry) ? "Browser benchmark: not run yet." : "";
  }

  const benchmark = benchmarkEntry.benchmark;
  const parts = [
    `Browser benchmark ${benchmark.passCount}/${benchmark.totalCount}`,
    benchmark.hardFailureCount > 0 ? `${benchmark.hardFailureCount} hard fail${benchmark.hardFailureCount === 1 ? "" : "s"}` : "0 hard fails",
    benchmark.medianElapsedMs > 0 ? `${Math.round(benchmark.medianElapsedMs / 1000)}s median` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function renderCatalog(catalog, manifest) {
  modelsList.replaceChildren();
  if (!catalog || catalog.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No models synced yet. Add a provider key and click Sync models.";
    modelsList.append(empty);
    return;
  }

  catalog.forEach(entry => {
    const benchmarkEntry = getModelBenchmarkEntry(manifest, entry.provider, entry.id);
    const benchmarkKey = `${entry.provider}::${entry.id}`;
    const item = document.createElement("div");
    item.className = "settings-item";

    const copy = document.createElement("div");
    copy.className = "settings-item-copy";

    const title = document.createElement("div");
    title.className = "settings-item-title";
    title.textContent = entry.displayName || entry.id;

    const meta = document.createElement("div");
    meta.className = "settings-item-meta";
    const priceParts = [];
    if (entry.inputPricePerMToken  != null) priceParts.push(`$${entry.inputPricePerMToken.toFixed(2)}/M in`);
    if (entry.outputPricePerMToken != null) priceParts.push(`$${entry.outputPricePerMToken.toFixed(2)}/M out`);
    meta.textContent = `${entry.provider} · ${entry.id}${priceParts.length ? " · " + priceParts.join(" · ") : ""}`;

    const tags = document.createElement("div");
    tags.className = "settings-item-tags";
    capabilityTags(entry, benchmarkEntry).forEach(({ label, cls }) => {
      const t = document.createElement("span");
      t.className = `settings-tag ${cls}`;
      t.textContent = label;
      tags.append(t);
    });

    copy.append(title, meta, tags);
    const benchmarkMeta = formatBenchmarkMeta(entry, benchmarkEntry);
    if (benchmarkMeta) {
      const benchmarkLine = document.createElement("div");
      benchmarkLine.className = "settings-item-meta";
      benchmarkLine.textContent = benchmarkMeta;
      copy.append(benchmarkLine);
    }

    const actions = document.createElement("div");
    actions.className = "settings-item-actions";

    if (isBrowserControlBenchmarkCandidate(entry)) {
      const benchmarkButton = document.createElement("button");
      benchmarkButton.type = "button";
      benchmarkButton.className = "settings-button";
      benchmarkButton.textContent = activeBenchmarks.has(benchmarkKey)
        ? "Benchmarking…"
        : benchmarkEntry
          ? "Re-run benchmark"
          : "Benchmark";
      if (activeBenchmarks.has(benchmarkKey)) {
        benchmarkButton.classList.add("is-loading");
      }
      benchmarkButton.addEventListener("click", async () => {
        activeBenchmarks.add(benchmarkKey);
        renderCatalog(await loadCatalog(), await loadBenchmarkManifest());
        showStatus(modelsSyncStatus, `Benchmarking ${entry.displayName || entry.id}. This will drive the live browser.`, "info");
        try {
          const result = await callSidecarRpc("ProviderBenchmarkBrowserControl", {
            provider: entry.provider,
            model_id: entry.id
          });
          const nextManifest = recordModelBenchmarkResult(await loadBenchmarkManifest(), result);
          await saveBenchmarkManifest(nextManifest);
          renderCatalog(await loadCatalog(), nextManifest);
          showStatus(
            modelsSyncStatus,
            `${result.policy_status === "approved" ? "Approved" : result.policy_status === "blocked" ? "Blocked" : "Marked experimental"} ${entry.displayName || entry.id} (${result.summary.pass_count}/${result.summary.total_count}).`,
            result.policy_status === "approved" ? "ok" : result.policy_status === "blocked" ? "error" : "info"
          );
        } catch (error) {
          showStatus(modelsSyncStatus, error instanceof Error ? error.message : String(error), "error");
        } finally {
          activeBenchmarks.delete(benchmarkKey);
          renderCatalog(await loadCatalog(), await loadBenchmarkManifest());
        }
      });
      actions.append(benchmarkButton);
    }

    if (entry.source === "manual") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "settings-button settings-button--danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        const current = await loadCatalog();
        const next = deleteManualModel(current, entry.provider, entry.id);
        await saveCatalog(next);
        renderCatalog(next, await loadBenchmarkManifest());
      });
      actions.append(remove);
    }

    item.append(copy, actions);
    modelsList.append(item);
  });
}

async function syncModels(providers) {
  if (!providers || providers.length === 0) {
    showStatus(modelsSyncStatus, "No providers configured. Add a provider key first.", "error");
    return;
  }

  modelsSyncBtn.classList.add("is-syncing", "is-loading");
  showStatus(modelsSyncStatus, "Syncing models from providers…", "info");

  const existingCatalog = await loadCatalog();

  let catalog = existingCatalog;
  const errors = [];

  for (const prov of providers) {
    try {
      const resp = await fetch("http://127.0.0.1:3210/api/list-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: prov.provider, api_key: prov.apiKey, base_url: prov.baseUrl || undefined })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const { catalog: next } = await syncModelCatalogs({
        existingCatalog: catalog,
        unlockedProviders: [prov],
        listModels: () => Promise.resolve(payload)
      });
      catalog = next;
    } catch (err) {
      errors.push(prov.provider);
    }
  }

  await saveCatalog(catalog);
  renderCatalog(catalog, await loadBenchmarkManifest());
  modelsSyncBtn.classList.remove("is-syncing", "is-loading");

  if (errors.length > 0) {
    showStatus(modelsSyncStatus, `Sync done — errors for: ${errors.join(", ")} (check provider key or server).`, "error");
  } else {
    showStatus(modelsSyncStatus, `✓ Models synced — ${catalog.length} model(s) available.`, "ok");
  }
}

// ─── Model config ─────────────────────────────────────────────────────────────

async function loadModelConfig() {
  const result = await chromeGet(MODEL_CONFIG_STORAGE_KEY);
  return normalizeModelConfig(result[MODEL_CONFIG_STORAGE_KEY]);
}

function applyModelConfigToForm(config) {
  if (modelModeSelect)     modelModeSelect.value     = config.defaultModelMode || "auto";
  if (thinkingLevelSelect) thinkingLevelSelect.value = config.thinkingLevel    || "low";
  if (functionCallingTog)  functionCallingTog.checked = config.enableFunctionCalling !== false;
  if (browserSearchTog)    browserSearchTog.checked   = config.allowBrowserSearch    !== false;
  if (codeExecutionTog)    codeExecutionTog.checked   = config.enableCodeExecution   !== false;
}

async function saveModelConfigFromForm() {
  const config = normalizeModelConfig({
    defaultModelMode:      modelModeSelect?.value    || "auto",
    thinkingLevel:         thinkingLevelSelect?.value || "low",
    enableFunctionCalling: functionCallingTog?.checked !== false,
    allowBrowserSearch:    browserSearchTog?.checked  !== false,
    enableCodeExecution:   codeExecutionTog?.checked  !== false
  });
  await chromeSet({ [MODEL_CONFIG_STORAGE_KEY]: config });
  return config;
}

// ─── Chats ────────────────────────────────────────────────────────────────────

async function loadChats() {
  if (!globalThis.chrome?.storage?.local) return { sessions: [], activeSessionId: null };
  const result = await chrome.storage.local.get(CHAT_SESSIONS_STORAGE_KEY);
  return normalizeChatSessionsStore(result[CHAT_SESSIONS_STORAGE_KEY]);
}

async function renderMemory(settings, modelConfig) {
  const store = await loadMemoryStore();
  const viewModel = await buildMemoryViewModel(settings, store, { modelConfig });

  memoryManualList.replaceChildren();
  if (viewModel.manualItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No manual memories yet.";
    memoryManualList.append(empty);
  } else {
    viewModel.manualItems.forEach((item) => {
      const node = document.createElement("div");
      node.className = "settings-item";

      const copy = document.createElement("div");
      copy.className = "settings-item-copy";

      const title = document.createElement("div");
      title.className = "settings-item-title";
      title.textContent = "Manual memory";

      const meta = document.createElement("div");
      meta.className = "settings-item-meta";
      meta.textContent = item.text;

      copy.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "settings-item-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "settings-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        memoryEntryId.value = item.id;
        memoryEntryText.value = item.text;
        memoryEntryText.focus();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "settings-button settings-button--danger";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        const next = deleteManualMemory(await loadMemoryStore(), item.id);
        await saveMemoryStore(next);
        await renderMemory(settings, modelConfig);
        showStatus(memoryStatus, "Memory removed.");
      });

      actions.append(edit, remove);
      node.append(copy, actions);
      memoryManualList.append(node);
    });
  }

  memoryDerivedList.replaceChildren();
  if (viewModel.derivedItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No derived memories enabled.";
    memoryDerivedList.append(empty);
  } else {
    viewModel.derivedItems.forEach((item) => {
      const node = document.createElement("div");
      node.className = "settings-item";

      const copy = document.createElement("div");
      copy.className = "settings-item-copy";

      const title = document.createElement("div");
      title.className = "settings-item-title";
      title.textContent = item.title || item.source;

      const meta = document.createElement("div");
      meta.className = "settings-item-meta";
      meta.textContent = item.text;

      copy.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "settings-item-actions";

      const hide = document.createElement("button");
      hide.type = "button";
      hide.className = "settings-button";
      hide.textContent = "Hide";
      hide.addEventListener("click", async () => {
        const next = hideDerivedMemory(await loadMemoryStore(), item.key);
        await saveMemoryStore(next);
        await renderMemory(settings, modelConfig);
        showStatus(memoryStatus, "Derived memory hidden.");
      });

      actions.append(hide);
      node.append(copy, actions);
      memoryDerivedList.append(node);
    });
  }
}

function renderChats(store) {
  const sessions = store.sessions.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  chatList.replaceChildren();
  if (sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No chats saved yet.";
    chatList.append(empty);
    return;
  }
  sessions.forEach(session => {
    const item = document.createElement("div");
    item.className = "settings-item";

    const copy = document.createElement("div");
    copy.className = "settings-item-copy";

    const title = document.createElement("div");
    title.className = "settings-item-title";
    title.textContent = session.title || "Untitled chat";

    const meta = document.createElement("div");
    meta.className = "settings-item-meta";
    meta.textContent = formatTimestamp(session.updatedAt);

    copy.append(title, meta);
    item.append(copy);
    chatList.append(item);
  });
}

async function loadShortcutsStore() {
  const result = await chromeGet(SHORTCUTS_STORAGE_KEY);
  return normalizeShortcuts(result[SHORTCUTS_STORAGE_KEY]);
}

async function saveShortcutsStore(shortcuts) {
  await chromeSet({ [SHORTCUTS_STORAGE_KEY]: normalizeShortcuts(shortcuts) });
}

function resetShortcutForm() {
  shortcutIdInput.value = "";
  shortcutTriggerInput.value = "";
  shortcutLabelInput.value = "";
  shortcutInstructions.value = "";
}

function openShortcutForm(entry = null) {
  shortcutsForm.hidden = false;
  shortcutIdInput.value = entry?.id ?? "";
  shortcutTriggerInput.value = entry?.trigger ?? "";
  shortcutLabelInput.value = entry?.label ?? "";
  shortcutInstructions.value = entry?.instructions ?? "";
  shortcutTriggerInput.focus();
}

function closeShortcutForm() {
  shortcutsForm.hidden = true;
  resetShortcutForm();
}

function renderShortcuts(shortcuts) {
  shortcutsList.replaceChildren();
  if (!Array.isArray(shortcuts) || shortcuts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = "No custom commands yet.";
    shortcutsList.append(empty);
    return;
  }

  shortcuts.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "settings-item";

    const copy = document.createElement("div");
    copy.className = "settings-item-copy";

    const title = document.createElement("div");
    title.className = "settings-item-title";
    title.textContent = `${entry.trigger} · ${entry.label}`;

    const meta = document.createElement("div");
    meta.className = "settings-item-meta";
    meta.textContent = entry.instructions;

    copy.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "settings-item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "settings-button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openShortcutForm(entry));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "settings-button settings-button--danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      const next = deleteShortcut(shortcuts, entry.id);
      await saveShortcutsStore(next);
      renderShortcuts(next);
      showStatus(shortcutsStatus, `Removed ${entry.trigger}.`);
    });

    actions.append(edit, remove);
    item.append(copy, actions);
    shortcutsList.append(item);
  });
}

// ─── Active nav tracking ──────────────────────────────────────────────────────

function setupNavHighlight() {
  const sections = Array.from(document.querySelectorAll(".settings-section[id]"));
  const navItems = Array.from(document.querySelectorAll(".settings-nav-item[data-section]"));

  if (!sections.length || !navItems.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navItems.forEach(item => {
        item.classList.toggle("is-active", item.dataset.section === id);
      });
    });
  }, { rootMargin: "-20% 0px -60% 0px", threshold: 0 });

  sections.forEach(s => observer.observe(s));

  // Also handle click navigation
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(n => n.classList.remove("is-active"));
      item.classList.add("is-active");
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Render audio support line
  audioSupport.textContent =
    `Narration: ${isNarrationSupported() ? "supported" : "unavailable"} · ` +
    `Recording: ${isAudioRecordingSupported() ? "supported" : "unavailable"}`;

  // Load everything in parallel
  const [rawSettings, store, providers, modelConfig, agentConfig, catalog, benchmarkManifest, shortcuts] = await Promise.all([
    loadPanelSettings(),
    loadChats(),
    loadProviders(),
    loadModelConfig(),
    loadAgentConfig(),
    loadCatalog(),
    loadBenchmarkManifest(),
    loadShortcutsStore()
  ]);

  // ── Audio ──
  let currentSettings = normalizePanelSettings(rawSettings);
  narrationToggle.checked    = currentSettings.narrationEnabled;
  transcriptionToggle.checked= currentSettings.transcriptionEnabled;
  transcriptionModelInput.value = currentSettings.transcriptionModelId;
  transcriptionLanguageInput.value = currentSettings.transcriptionLanguage;
  browserAdminToggle.checked = currentSettings.browserAdminEnabled;
  extensionManagementToggle.checked = currentSettings.extensionManagementEnabled;
  memoryManualToggle.checked = currentSettings.memoryManualEnabled;
  memoryBookmarksToggle.checked = currentSettings.memoryBookmarksEnabled;
  memoryHistoryToggle.checked = currentSettings.memoryHistoryEnabled;
  memorySettingsToggle.checked = currentSettings.memorySettingsEnabled;

  narrationToggle.addEventListener("change", async () => {
    currentSettings = await savePanelSettings({ ...currentSettings, narrationEnabled: narrationToggle.checked });
  });
  transcriptionToggle.addEventListener("change", async () => {
    currentSettings = await savePanelSettings({ ...currentSettings, transcriptionEnabled: transcriptionToggle.checked });
  });
  const saveTranscriptionFields = async () => {
    currentSettings = await savePanelSettings({
      ...currentSettings,
      transcriptionModelId: transcriptionModelInput.value,
      transcriptionLanguage: transcriptionLanguageInput.value
    });
  };
  transcriptionModelInput.addEventListener("blur", saveTranscriptionFields);
  transcriptionLanguageInput.addEventListener("blur", saveTranscriptionFields);
  for (const [element, key] of [
    [browserAdminToggle, "browserAdminEnabled"],
    [extensionManagementToggle, "extensionManagementEnabled"],
    [memoryManualToggle, "memoryManualEnabled"],
    [memoryBookmarksToggle, "memoryBookmarksEnabled"],
    [memoryHistoryToggle, "memoryHistoryEnabled"],
    [memorySettingsToggle, "memorySettingsEnabled"]
  ]) {
    element?.addEventListener("change", async () => {
      currentSettings = await savePanelSettings({
        ...currentSettings,
        [key]: element.checked
      });
      await renderMemory(currentSettings, await loadModelConfig());
    });
  }
  memoryCancelBtn?.addEventListener("click", () => {
    memoryEntryId.value = "";
    memoryEntryText.value = "";
  });
  memorySaveBtn?.addEventListener("click", async () => {
    const next = upsertManualMemory(await loadMemoryStore(), {
      id: memoryEntryId.value,
      text: memoryEntryText.value
    });
    await saveMemoryStore(next);
    memoryEntryId.value = "";
    memoryEntryText.value = "";
    await renderMemory(currentSettings, await loadModelConfig());
    showStatus(memoryStatus, "Memory saved.");
  });
  await renderMemory(currentSettings, modelConfig);

  // ── Agent config — auto-save ──
  applyAgentConfigToForm(agentConfig);
  async function autoSaveAgent() {
    const cfg = readAgentConfigFromForm();
    await chromeSet({ [AGENT_CONFIG_STORAGE_KEY]: cfg });
    showSavedDot(agentSaveDot);
  }
  for (const el of [agentVisionToggle, agentHighlightsTog, agentReplayToggle]) {
    el?.addEventListener("change", autoSaveAgent);
  }
  for (const el of [agentMaxSteps, agentMaxActions, agentFailureTol, agentReplanFreq, agentPageLoadWait]) {
    el?.addEventListener("blur", autoSaveAgent);
  }

  // ── Providers ──
  renderProviders(providers);
  if (providers.length > 0) {
    const first = providers[0];
    providerIdInput.value    = first.provider;
    providerModelInput.value = first.preferredModel || "";
    providerKeyInput.placeholder = maskKey(first.apiKey) + " (enter new key to change)";
  }

  providerSaveBtn.addEventListener("click", async () => {
    const provider = normalizeProviderId(providerIdInput.value);
    const rawKey   = providerKeyInput.value.trim();
    const baseUrl  = providerBaseUrlInput.value.trim();
    const preferredModel = providerModelInput.value.trim();
    if (!provider) { showStatus(providerSaveStatus, "Provider ID is required.", "error"); return; }

    let apiKey = rawKey;
    let current = null;
    if (!apiKey) {
      current = await loadProviders();
      const existing = current.find(p => p.provider === provider);
      if (existing) { apiKey = existing.apiKey; }
      else { showStatus(providerSaveStatus, "API key is required.", "error"); return; }
    }

    await rememberUnlockedProviderSession({ provider, apiKey, baseUrl, preferredModel });
    const updated = current ?? await loadProviders();
    const next = updated.filter(p => p.provider !== provider).concat({
      provider, apiKey, baseUrl, preferredModel, unlockedAt: new Date().toISOString()
    });
    renderProviders(next);
    providerKeyInput.value = "";
    providerKeyInput.placeholder = maskKey(apiKey) + " (enter new key to change)";
    showStatus(providerSaveStatus, `✓ ${provider} key saved.`);
  });

  // ── Models ──
  renderCatalog(catalog, benchmarkManifest);

  modelsSyncBtn.addEventListener("click", async () => {
    const currentProviders = await loadProviders();
    await syncModels(currentProviders);
  });

  modelsAddBtn.addEventListener("click", () => {
    modelsAddForm.hidden = !modelsAddForm.hidden;
    if (!modelsAddForm.hidden) manualModelProvider.focus();
  });

  manualModelCancel.addEventListener("click", () => {
    modelsAddForm.hidden = true;
    manualModelProvider.value = "";
    manualModelId.value       = "";
    manualModelName.value     = "";
  });

  manualModelSave.addEventListener("click", async () => {
    const provider = normalizeProviderId(manualModelProvider.value);
    const id       = manualModelId.value.trim();
    const name     = manualModelName.value.trim();
    if (!provider || !id) {
      showStatus(modelsSyncStatus, "Provider and Model ID are required.", "error");
      return;
    }
    const current = await loadCatalog();
    const next    = upsertManualModel(current, { provider, id, displayName: name || undefined, source: "manual" });
    await saveCatalog(next);
    renderCatalog(next, await loadBenchmarkManifest());
    modelsAddForm.hidden = true;
    manualModelProvider.value = "";
    manualModelId.value       = "";
    manualModelName.value     = "";
    showStatus(modelsSyncStatus, `✓ Added ${name || id}.`);
  });

  // ── Model config — auto-save ──
  applyModelConfigToForm(modelConfig);
  async function autoSaveModelConfig() {
    await saveModelConfigFromForm();
    showSavedDot(modelSaveDot);
  }
  for (const el of [modelModeSelect, thinkingLevelSelect, functionCallingTog, browserSearchTog, codeExecutionTog]) {
    el?.addEventListener("change", autoSaveModelConfig);
  }

  // ── Chats ──
  renderChats(store);
  clearChatsBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(CHAT_SESSIONS_STORAGE_KEY);
    renderChats({ sessions: [], activeSessionId: null });
  });

  renderShortcuts(shortcuts);
  shortcutsAddBtn.addEventListener("click", () => {
    if (shortcutsForm.hidden) {
      openShortcutForm();
    } else {
      closeShortcutForm();
    }
  });
  shortcutsCancelBtn.addEventListener("click", closeShortcutForm);
  shortcutsSaveBtn.addEventListener("click", async () => {
    const current = await loadShortcutsStore();
    const next = upsertShortcut(current, {
      id: shortcutIdInput.value.trim() || undefined,
      trigger: shortcutTriggerInput.value,
      label: shortcutLabelInput.value,
      instructions: shortcutInstructions.value
    });
    await saveShortcutsStore(next);
    renderShortcuts(next);
    closeShortcutForm();
    showStatus(shortcutsStatus, "Command saved.");
  });

  // ── Storage change listener ──
  if (globalThis.chrome?.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes[PANEL_SETTINGS_STORAGE_KEY]) {
        const next = normalizePanelSettings(changes[PANEL_SETTINGS_STORAGE_KEY].newValue);
        currentSettings = next;
        narrationToggle.checked     = next.narrationEnabled;
        transcriptionToggle.checked = next.transcriptionEnabled;
        transcriptionModelInput.value = next.transcriptionModelId;
        transcriptionLanguageInput.value = next.transcriptionLanguage;
        browserAdminToggle.checked = next.browserAdminEnabled;
        extensionManagementToggle.checked = next.extensionManagementEnabled;
        memoryManualToggle.checked = next.memoryManualEnabled;
        memoryBookmarksToggle.checked = next.memoryBookmarksEnabled;
        memoryHistoryToggle.checked = next.memoryHistoryEnabled;
        memorySettingsToggle.checked = next.memorySettingsEnabled;
        await renderMemory(next, await loadModelConfig());
      }
      if (changes[MEMORY_STORE_STORAGE_KEY]) {
        await renderMemory(currentSettings, await loadModelConfig());
      }
      if (changes[CHAT_SESSIONS_STORAGE_KEY]) {
        renderChats(normalizeChatSessionsStore(changes[CHAT_SESSIONS_STORAGE_KEY].newValue));
      }
      if (changes[SHORTCUTS_STORAGE_KEY]) {
        renderShortcuts(normalizeShortcuts(changes[SHORTCUTS_STORAGE_KEY].newValue));
      }
      if (changes[PROVIDER_SESSION_STORAGE_KEY]) {
        renderProviders(Object.values(changes[PROVIDER_SESSION_STORAGE_KEY].newValue || {}));
      }
      if (changes[MODEL_CONFIG_STORAGE_KEY]) {
        applyModelConfigToForm(normalizeModelConfig(changes[MODEL_CONFIG_STORAGE_KEY].newValue));
      }
      if (changes[AGENT_CONFIG_STORAGE_KEY]) {
        applyAgentConfigToForm(normalizeAgentConfig(changes[AGENT_CONFIG_STORAGE_KEY].newValue));
      }
      if (changes[MODEL_CATALOG_STORAGE_KEY]) {
        renderCatalog(
          normalizeModelCatalog(changes[MODEL_CATALOG_STORAGE_KEY].newValue),
          changes[MODEL_BENCHMARK_STORAGE_KEY]
            ? normalizeModelBenchmarkManifest(changes[MODEL_BENCHMARK_STORAGE_KEY].newValue)
            : await loadBenchmarkManifest()
        );
      }
      if (changes[MODEL_BENCHMARK_STORAGE_KEY] && !changes[MODEL_CATALOG_STORAGE_KEY]) {
        renderCatalog(await loadCatalog(), normalizeModelBenchmarkManifest(changes[MODEL_BENCHMARK_STORAGE_KEY].newValue));
      }
    });
  }

  setupNavHighlight();
}

main();
