import { describe, expect, it } from "vitest";

import {
  PANEL_SETTINGS_STORAGE_KEY,
  loadPanelSettings,
  normalizePanelSettings,
  savePanelSettings
} from "../../extension/lib/panel-settings.js";

describe("panel settings", () => {
  it("normalizes to safe defaults", () => {
    expect(normalizePanelSettings(null)).toEqual({
      appearanceTheme: "system",
      requireToolbarPin: false,
      developerModeEnabled: false,
      narrationEnabled: false,
      transcriptionEnabled: false,
      transcriptionProvider: "",
      transcriptionModelId: "",
      transcriptionLanguage: "",
      browserAdminEnabled: false,
      localShellEnabled: false,
      extensionManagementEnabled: false,
      memoryManualEnabled: true,
      memoryBookmarksEnabled: false,
      memoryHistoryEnabled: false,
      memorySettingsEnabled: false
    });

    expect(normalizePanelSettings({
      narrationEnabled: true
    })).toEqual({
      appearanceTheme: "system",
      requireToolbarPin: false,
      developerModeEnabled: false,
      narrationEnabled: true,
      transcriptionEnabled: false,
      transcriptionProvider: "",
      transcriptionModelId: "",
      transcriptionLanguage: "",
      browserAdminEnabled: false,
      localShellEnabled: false,
      extensionManagementEnabled: false,
      memoryManualEnabled: true,
      memoryBookmarksEnabled: false,
      memoryHistoryEnabled: false,
      memorySettingsEnabled: false
    });

    expect(normalizePanelSettings({
      appearanceTheme: "dark",
      requireToolbarPin: false,
      developerModeEnabled: true,
      transcriptionEnabled: true,
      transcriptionProvider: "openai",
      transcriptionModelId: "models/gemini-2.5-flash",
      transcriptionLanguage: "en-GB",
      browserAdminEnabled: true,
      localShellEnabled: true,
      extensionManagementEnabled: true,
      memoryManualEnabled: false,
      memoryBookmarksEnabled: true,
      memoryHistoryEnabled: true,
      memorySettingsEnabled: true
    })).toEqual({
      appearanceTheme: "dark",
      requireToolbarPin: false,
      developerModeEnabled: true,
      narrationEnabled: false,
      transcriptionEnabled: true,
      transcriptionProvider: "openai",
      transcriptionModelId: "models/gemini-2.5-flash",
      transcriptionLanguage: "en-GB",
      browserAdminEnabled: true,
      localShellEnabled: true,
      extensionManagementEnabled: true,
      memoryManualEnabled: false,
      memoryBookmarksEnabled: true,
      memoryHistoryEnabled: true,
      memorySettingsEnabled: true
    });
  });

  it("persists through localStorage fallback when chrome.storage is unavailable", async () => {
    const storage = new Map();
    const localStorage = {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, value);
      }
    };

    const originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorage,
      configurable: true
    });

    try {
      await savePanelSettings({
        developerModeEnabled: true,
        transcriptionEnabled: true,
        transcriptionProvider: "openai",
        transcriptionModelId: "gpt-4o-transcribe",
        transcriptionLanguage: "en-GB"
      }, null);

      const loaded = await loadPanelSettings(null);
      expect(loaded.developerModeEnabled).toBe(true);
      expect(loaded.transcriptionEnabled).toBe(true);
      expect(loaded.transcriptionProvider).toBe("openai");
      expect(loaded.transcriptionModelId).toBe("gpt-4o-transcribe");
      expect(loaded.transcriptionLanguage).toBe("en-GB");
      expect(JSON.parse(storage.get(PANEL_SETTINGS_STORAGE_KEY))).toMatchObject({
        developerModeEnabled: true,
        transcriptionProvider: "openai",
        transcriptionModelId: "gpt-4o-transcribe"
      });
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: originalLocalStorage,
        configurable: true
      });
    }
  });
});
