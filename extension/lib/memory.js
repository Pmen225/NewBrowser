import { normalizeModelConfig } from "./model-config.js";
import { normalizePanelSettings } from "./panel-settings.js";

export const MEMORY_STORE_STORAGE_KEY = "ui.memoryStore";

function nowIso(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return new Date().toISOString();
}

function createId(idFactory) {
  const factory = typeof idFactory === "function" ? idFactory : () => `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return factory();
}

function normalizeManualItem(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!id || !text) {
    return null;
  }

  return {
    id,
    text,
    createdAt: nowIso(raw.createdAt),
    updatedAt: nowIso(raw.updatedAt)
  };
}

export function normalizeMemoryStore(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    manualItems: Array.isArray(value.manualItems) ? value.manualItems.map((item) => normalizeManualItem(item)).filter(Boolean) : [],
    hiddenSourceKeys: Array.isArray(value.hiddenSourceKeys)
      ? value.hiddenSourceKeys.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
      : []
  };
}

export async function loadMemoryStore(storage = globalThis.chrome?.storage?.local) {
  if (!storage?.get) {
    return normalizeMemoryStore(null);
  }

  try {
    const result = await storage.get([MEMORY_STORE_STORAGE_KEY]);
    return normalizeMemoryStore(result?.[MEMORY_STORE_STORAGE_KEY]);
  } catch {
    return normalizeMemoryStore(null);
  }
}

export async function saveMemoryStore(store, storage = globalThis.chrome?.storage?.local) {
  const normalized = normalizeMemoryStore(store);
  if (!storage?.set) {
    return normalized;
  }

  try {
    await storage.set({ [MEMORY_STORE_STORAGE_KEY]: normalized });
  } catch {}
  return normalized;
}

export function upsertManualMemory(store, item, options = {}) {
  const normalizedStore = normalizeMemoryStore(store);
  const text = typeof item?.text === "string" ? item.text.trim() : "";
  if (!text) {
    return normalizedStore;
  }

  const timestamp = nowIso(options.now);
  const id = typeof item?.id === "string" && item.id.trim().length > 0 ? item.id.trim() : createId(options.idFactory);
  const existing = normalizedStore.manualItems.find((entry) => entry.id === id);
  const nextItem = {
    id,
    text,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  return {
    ...normalizedStore,
    manualItems: normalizedStore.manualItems.filter((entry) => entry.id !== id).concat([nextItem])
  };
}

export function deleteManualMemory(store, id) {
  const normalizedStore = normalizeMemoryStore(store);
  const targetId = typeof id === "string" ? id.trim() : "";
  if (!targetId) {
    return normalizedStore;
  }

  return {
    ...normalizedStore,
    manualItems: normalizedStore.manualItems.filter((entry) => entry.id !== targetId)
  };
}

export function hideDerivedMemory(store, sourceKey) {
  const normalizedStore = normalizeMemoryStore(store);
  const key = typeof sourceKey === "string" ? sourceKey.trim() : "";
  if (!key || normalizedStore.hiddenSourceKeys.includes(key)) {
    return normalizedStore;
  }

  return {
    ...normalizedStore,
    hiddenSourceKeys: normalizedStore.hiddenSourceKeys.concat([key])
  };
}

function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isMemoryRecallPrompt(prompt) {
  const normalized = String(prompt ?? "").toLowerCase();
  return (
    normalized.includes("what do you remember") ||
    normalized.includes("what do you know about me") ||
    normalized.includes("remember about how") ||
    normalized.includes("remember about me") ||
    normalized.includes("my usual style") ||
    normalized.includes("my preferences") ||
    normalized.includes("my workflow") ||
    normalized.includes("what should you know about me")
  );
}

function isPersonalMemoryEntry(entry) {
  return entry?.source === "manual" || entry?.source === "settings";
}

function sortByRecency(left, right) {
  return String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""));
}

function listRecentPersonalEntries(entries) {
  return entries.filter((entry) => isPersonalMemoryEntry(entry)).sort(sortByRecency);
}

export function selectRelevantMemoryEntries(prompt, entries, limit = 4) {
  const normalizedEntries = Array.isArray(entries)
    ? entries.filter((entry) => entry && typeof entry.text === "string" && entry.text.trim().length > 0)
    : [];
  if (normalizedEntries.length === 0) {
    return [];
  }

  if (isMemoryRecallPrompt(prompt)) {
    const prioritized = listRecentPersonalEntries(normalizedEntries);
    if (prioritized.length > 0) {
      return prioritized.slice(0, Math.max(1, limit));
    }
  }

  const promptTokens = new Set(tokenize(prompt));
  const scored = normalizedEntries
    .map((entry) => {
      const haystack = `${entry.title ?? ""} ${entry.text}`;
      const entryTokens = tokenize(haystack);
      let score = 0;
      for (const token of entryTokens) {
        if (promptTokens.has(token)) {
          score += 1;
        }
      }
      if (entry.source === "manual") {
        score += 0.35;
      }
      if (entry.source === "settings") {
        score += 0.15;
      }
      return {
        entry,
        score
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || String(right.entry.updatedAt ?? "").localeCompare(String(left.entry.updatedAt ?? "")));

  if (scored.length > 0) {
    const cappedLimit = Math.max(1, limit);
    const selected = scored.slice(0, cappedLimit).map((candidate) => candidate.entry);
    if (!selected.some((entry) => isPersonalMemoryEntry(entry))) {
      const personalFallback = listRecentPersonalEntries(normalizedEntries)
        .find((entry) => !selected.some((selectedEntry) => selectedEntry.key === entry.key));
      if (personalFallback) {
        if (selected.length >= cappedLimit) {
          selected[selected.length - 1] = personalFallback;
        } else {
          selected.push(personalFallback);
        }
      }
    }
    return selected;
  }

  const personalFallback = listRecentPersonalEntries(normalizedEntries);
  if (personalFallback.length > 0) {
    return personalFallback.slice(0, Math.max(1, Math.min(limit, 3)));
  }

  return normalizedEntries.slice(0, Math.max(1, limit));
}

function buildSettingsSummary(settingsSnapshot = {}) {
  const panel = normalizePanelSettings(settingsSnapshot.panelSettings);
  const model = normalizeModelConfig(settingsSnapshot.modelConfig);
  const facts = [];
  if (panel.transcriptionEnabled) {
    facts.push(`Dictation enabled with ${panel.transcriptionModelId || "configured transcription model"}.`);
  }
  if (panel.browserAdminEnabled) {
    facts.push("Browser admin pages are enabled.");
  }
  if (panel.extensionManagementEnabled) {
    facts.push("Extension management is enabled.");
  }
  facts.push(`Default model mode is ${model.defaultModelMode}.`);
  if (typeof model.selectedProvider === "string" && model.selectedProvider.trim()) {
    facts.push(`Selected provider is ${model.selectedProvider.trim()}.`);
  }
  if (typeof model.selectedModelId === "string" && model.selectedModelId.trim()) {
    facts.push(`Selected model is ${model.selectedModelId.trim()}.`);
  }
  return facts.join(" ");
}

export async function buildDerivedMemoryEntries(settings, store, options = {}) {
  const normalizedSettings = normalizePanelSettings(settings);
  const normalizedStore = normalizeMemoryStore(store);
  const hiddenKeys = new Set(normalizedStore.hiddenSourceKeys);
  const entries = [];

  if (normalizedSettings.memoryBookmarksEnabled && globalThis.chrome?.bookmarks?.getRecent) {
    try {
      const bookmarks = await chrome.bookmarks.getRecent(10);
      for (const item of bookmarks) {
        const key = `bookmark:${item.id}`;
        if (hiddenKeys.has(key) || !item.url) {
          continue;
        }
        entries.push({
          key,
          id: key,
          source: "bookmark",
          title: item.title || item.url,
          text: `${item.title || "Bookmark"} ${item.url}`.trim(),
          updatedAt: nowIso(item.dateAdded ? new Date(item.dateAdded).toISOString() : undefined)
        });
      }
    } catch {}
  }

  if (normalizedSettings.memoryHistoryEnabled && globalThis.chrome?.history?.search) {
    try {
      const historyItems = await chrome.history.search({
        text: "",
        maxResults: 10,
        startTime: Date.now() - 30 * 24 * 60 * 60 * 1000
      });
      for (const item of historyItems) {
        const key = `history:${item.id ?? item.url}`;
        if (hiddenKeys.has(key) || !item.url) {
          continue;
        }
        entries.push({
          key,
          id: key,
          source: "history",
          title: item.title || item.url,
          text: `${item.title || "History"} ${item.url}`.trim(),
          updatedAt: nowIso(typeof item.lastVisitTime === "number" ? new Date(item.lastVisitTime).toISOString() : undefined)
        });
      }
    } catch {}
  }

  if (normalizedSettings.memorySettingsEnabled) {
    const key = "settings:current";
    const text = buildSettingsSummary({
      panelSettings: settings,
      modelConfig: options.modelConfig
    });
    if (text && !hiddenKeys.has(key)) {
      entries.push({
        key,
        id: key,
        source: "settings",
        title: "Current Atlas settings",
        text,
        updatedAt: nowIso()
      });
    }
  }

  return entries;
}

export async function buildMemoryContextItems(prompt, options = {}) {
  const normalizedSettings = normalizePanelSettings(options.settings);
  const normalizedStore = normalizeMemoryStore(options.store);
  const candidates = [];

  if (normalizedSettings.memoryManualEnabled) {
    for (const item of normalizedStore.manualItems) {
      candidates.push({
        key: `manual:${item.id}`,
        id: `manual:${item.id}`,
        source: "manual",
        title: "Manual memory",
        text: item.text,
        updatedAt: item.updatedAt
      });
    }
  }

  const derived = await buildDerivedMemoryEntries(normalizedSettings, normalizedStore, {
    modelConfig: options.modelConfig
  });
  const selected = selectRelevantMemoryEntries(prompt, candidates.concat(derived), 4);
  return selected.map((entry) => ({
    id: entry.id,
    source: entry.source,
    text: entry.text,
    ...(entry.title ? { title: entry.title } : {})
  }));
}

export async function buildMemoryViewModel(settings, store, options = {}) {
  const normalizedStore = normalizeMemoryStore(store);
  const manualItems = normalizedStore.manualItems
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const derivedItems = await buildDerivedMemoryEntries(settings, normalizedStore, options);
  return {
    manualItems,
    derivedItems
  };
}
