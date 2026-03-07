import { describe, expect, it } from "vitest";

import {
  normalizePanelSettings
} from "../../extension/lib/panel-settings.js";

describe("panel settings", () => {
  it("normalizes to safe defaults", () => {
    expect(normalizePanelSettings(null)).toEqual({
      narrationEnabled: false,
      transcriptionEnabled: false,
      transcriptionModelId: "",
      transcriptionLanguage: "",
      browserAdminEnabled: false,
      extensionManagementEnabled: false,
      memoryManualEnabled: true,
      memoryBookmarksEnabled: false,
      memoryHistoryEnabled: false,
      memorySettingsEnabled: false
    });

    expect(normalizePanelSettings({
      narrationEnabled: true
    })).toEqual({
      narrationEnabled: true,
      transcriptionEnabled: false,
      transcriptionModelId: "",
      transcriptionLanguage: "",
      browserAdminEnabled: false,
      extensionManagementEnabled: false,
      memoryManualEnabled: true,
      memoryBookmarksEnabled: false,
      memoryHistoryEnabled: false,
      memorySettingsEnabled: false
    });

    expect(normalizePanelSettings({
      transcriptionEnabled: true,
      transcriptionModelId: "models/gemini-2.5-flash",
      transcriptionLanguage: "en-GB",
      browserAdminEnabled: true,
      extensionManagementEnabled: true,
      memoryManualEnabled: false,
      memoryBookmarksEnabled: true,
      memoryHistoryEnabled: true,
      memorySettingsEnabled: true
    })).toEqual({
      narrationEnabled: false,
      transcriptionEnabled: true,
      transcriptionModelId: "models/gemini-2.5-flash",
      transcriptionLanguage: "en-GB",
      browserAdminEnabled: true,
      extensionManagementEnabled: true,
      memoryManualEnabled: false,
      memoryBookmarksEnabled: true,
      memoryHistoryEnabled: true,
      memorySettingsEnabled: true
    });
  });
});
