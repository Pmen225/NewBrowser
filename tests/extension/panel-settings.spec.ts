import { describe, expect, it } from "vitest";

import {
  normalizePanelSettings
} from "../../extension/lib/panel-settings.js";

describe("panel settings", () => {
  it("normalizes to safe defaults", () => {
    expect(normalizePanelSettings(null)).toEqual({
      narrationEnabled: false,
      transcriptionEnabled: false
    });

    expect(normalizePanelSettings({
      narrationEnabled: true
    })).toEqual({
      narrationEnabled: true,
      transcriptionEnabled: false
    });
  });
});

