export const PANEL_SETTINGS_STORAGE_KEY = "ui.panelSettings";

function getPersistentPanelSettingsStorage(storage = globalThis.chrome?.storage?.local) {
  if (storage?.get && storage?.set) {
    return storage;
  }
  if (typeof globalThis.localStorage === "object" && globalThis.localStorage !== null) {
    return {
      async get(keys) {
        const key = Array.isArray(keys) ? keys[0] : keys;
        if (typeof key !== "string" || !key) {
          return {};
        }
        const raw = globalThis.localStorage.getItem(key);
        if (!raw) {
          return {};
        }
        try {
          return { [key]: JSON.parse(raw) };
        } catch {
          return {};
        }
      },
      async set(obj) {
        for (const [key, value] of Object.entries(obj || {})) {
          globalThis.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    };
  }
  return null;
}

export function normalizePanelSettings(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    appearanceTheme: value.appearanceTheme === "light" || value.appearanceTheme === "dark" ? value.appearanceTheme : "system",
    requireToolbarPin: value.requireToolbarPin === true,
    developerModeEnabled: value.developerModeEnabled === true,
    narrationEnabled: value.narrationEnabled === true,
    transcriptionEnabled: value.transcriptionEnabled === true,
    transcriptionProvider: typeof value.transcriptionProvider === "string" ? value.transcriptionProvider.trim().toLowerCase() : "",
    transcriptionModelId: typeof value.transcriptionModelId === "string" ? value.transcriptionModelId.trim() : "",
    transcriptionLanguage: typeof value.transcriptionLanguage === "string" ? value.transcriptionLanguage.trim() : "",
    browserAdminEnabled: value.browserAdminEnabled === true,
    localShellEnabled: value.localShellEnabled === true,
    extensionManagementEnabled: value.extensionManagementEnabled === true,
    memoryManualEnabled: value.memoryManualEnabled !== false,
    memoryBookmarksEnabled: value.memoryBookmarksEnabled === true,
    memoryHistoryEnabled: value.memoryHistoryEnabled === true,
    memorySettingsEnabled: value.memorySettingsEnabled === true
  };
}

export async function loadPanelSettings(storage = globalThis.chrome?.storage?.local) {
  const persistentStorage = getPersistentPanelSettingsStorage(storage);
  if (!persistentStorage?.get) {
    return normalizePanelSettings(null);
  }

  try {
    const result = await persistentStorage.get([PANEL_SETTINGS_STORAGE_KEY]);
    return normalizePanelSettings(result?.[PANEL_SETTINGS_STORAGE_KEY]);
  } catch {
    return normalizePanelSettings(null);
  }
}

export async function savePanelSettings(nextSettings, storage = globalThis.chrome?.storage?.local) {
  const persistentStorage = getPersistentPanelSettingsStorage(storage);
  if (!persistentStorage?.set) {
    return normalizePanelSettings(nextSettings);
  }

  const normalized = normalizePanelSettings(nextSettings);
  try {
    await persistentStorage.set({
      [PANEL_SETTINGS_STORAGE_KEY]: normalized
    });
  } catch {}
  return normalized;
}
