import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("extension/options.html", "utf8");

describe("options settings layout", () => {
  it("preserves behavior-critical control ids", () => {
    const requiredIds = [
      "provider-save-btn",
      "provider-id-input",
      "provider-key-input",
      "provider-model-input",
      "provider-base-url-input",
      "model-config-save-btn",
      "model-mode-select",
      "thinking-level-select",
      "function-calling-toggle",
      "browser-search-toggle",
      "code-execution-toggle",
      "narration-toggle",
      "transcription-toggle",
      "clear-chats-btn",
      "chat-list",
      "provider-list",
      "audio-support",
      "model-config-status",
      "provider-save-status"
    ];

    for (const id of requiredIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("uses elegant dark atlas shell primitives", () => {
    expect(html).toContain("settings-app");
    expect(html).toContain("settings-menu-shell");
    expect(html).toContain("settings-menu-sidebar");
    expect(html).toContain("settings-pane");
    expect(html).toContain("settings-group-card");
    expect(html).toContain("settings-badge-cluster");
  });

  it("renders expected menu labels", () => {
    expect(html).toContain(">General<");
    expect(html).toContain(">Web Browsing<");
    expect(html).toContain(">Personalization<");
    expect(html).toContain(">Data Controls<");
    expect(html).toContain(">Agent Mode<");
  });
});
