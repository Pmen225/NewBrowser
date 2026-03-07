import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("extension/options.html", "utf8");

describe("options settings layout", () => {
  it("preserves behavior-critical control ids", () => {
    const requiredIds = [
      "agent-save-dot",
      "agent-vision-toggle",
      "agent-highlights-toggle",
      "agent-replay-toggle",
      "agent-max-steps",
      "agent-max-actions",
      "agent-failure-tolerance",
      "agent-replan-freq",
      "agent-page-load-wait",
      "provider-save-btn",
      "provider-id-input",
      "provider-key-input",
      "provider-model-input",
      "provider-base-url-input",
      "models-sync-btn",
      "models-add-btn",
      "models-add-form",
      "models-sync-status",
      "models-list",
      "model-mode-select",
      "thinking-level-select",
      "function-calling-toggle",
      "browser-search-toggle",
      "code-execution-toggle",
      "narration-toggle",
      "transcription-toggle",
      "clear-chats-btn",
      "chat-list",
      "shortcuts-add-btn",
      "shortcuts-form",
      "shortcut-id",
      "shortcut-trigger",
      "shortcut-label",
      "shortcut-instructions",
      "shortcuts-cancel-btn",
      "shortcuts-save-btn",
      "shortcuts-status",
      "shortcuts-list",
      "provider-list",
      "audio-support",
      "provider-save-status"
    ];

    for (const id of requiredIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("uses elegant dark atlas shell primitives", () => {
    expect(html).toContain("settings-shell");
    expect(html).toContain("settings-sidebar");
    expect(html).toContain("settings-main");
    expect(html).toContain("settings-nav");
    expect(html).toContain("settings-section");
    expect(html).toContain("settings-advanced");
  });

  it("renders expected menu labels", () => {
    expect(html).toContain(">Agent<");
    expect(html).toContain(">Provider<");
    expect(html).toContain(">Models<");
    expect(html).toContain(">Data<");
    expect(html).toContain(">Commands<");
  });
});
