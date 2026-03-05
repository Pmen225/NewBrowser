export const PANEL_SETTINGS_STORAGE_KEY = "ui.panelSettings";

export function normalizePanelSettings(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  return {
    narrationEnabled: value.narrationEnabled === true,
    transcriptionEnabled: value.transcriptionEnabled === true
  };
}

export async function loadPanelSettings(storage = globalThis.chrome?.storage?.local) {
  if (!storage?.get) {
    return normalizePanelSettings(null);
  }

  try {
    const result = await storage.get([PANEL_SETTINGS_STORAGE_KEY]);
    return normalizePanelSettings(result?.[PANEL_SETTINGS_STORAGE_KEY]);
  } catch {
    return normalizePanelSettings(null);
  }
}

export async function savePanelSettings(nextSettings, storage = globalThis.chrome?.storage?.local) {
  if (!storage?.set) {
    return normalizePanelSettings(nextSettings);
  }

  const normalized = normalizePanelSettings(nextSettings);
  try {
    await storage.set({
      [PANEL_SETTINGS_STORAGE_KEY]: normalized
    });
  } catch {}
  return normalized;
}

