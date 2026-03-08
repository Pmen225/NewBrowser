import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("extension/options.html", "utf8");
const script = readFileSync("extension/options.js", "utf8");

describe("options settings layout", () => {
  it("preserves behavior-critical control ids", () => {
    const requiredIds = [
      "appearance-theme-select",
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
      "provider-form",
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
      "transcription-provider-input",
      "transcription-model-input",
      "transcription-language-input",
      "transcription-provider-status",
      "transcription-model-status",
      "memory-manual-toggle",
      "memory-bookmarks-toggle",
      "memory-history-toggle",
      "memory-settings-toggle",
      "memory-entry-id",
      "memory-entry-text",
      "memory-save-btn",
      "memory-cancel-btn",
      "memory-status",
      "memory-manual-list",
      "memory-derived-list",
      "browser-admin-toggle",
      "local-shell-toggle",
      "extension-management-toggle",
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
      "provider-save-status",
      "general",
      "web-browsing",
      "personalization",
      "data-controls",
      "agent-mode"
    ];

    for (const id of requiredIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("uses atlas-style page categories instead of internal implementation buckets", () => {
    expect(html).toContain('data-page="general"');
    expect(html).toContain('data-page="web-browsing"');
    expect(html).toContain('data-page="personalization"');
    expect(html).toContain('data-page="data-controls"');
    expect(html).toContain('data-page="agent-mode"');
    expect(html).toContain(">General<");
    expect(html).toContain(">Web Browsing<");
    expect(html).toContain(">Personalization<");
    expect(html).toContain(">Data Controls<");
    expect(html).toContain(">Agent Mode<");
  });

  it("keeps agent mode scoped to agent behavior and command controls", () => {
    const agentModeStart = html.indexOf('id="agent-mode"');
    const agentModeEnd = html.indexOf("</section>\n    </section>", agentModeStart);
    const agentModeSlice = html.slice(agentModeStart, agentModeEnd + 10);
    expect(agentModeSlice).toContain("Agent behavior");
    expect(agentModeSlice).toContain("Commands");
    expect(agentModeSlice).not.toContain("Provider access");
    expect(agentModeSlice).not.toContain("Recent chats");
  });

  it("includes an appearance theme control and atlas-style page header", () => {
    expect(html).toContain("appearance-theme-select");
    expect(html).toContain("settings-page-header");
    expect(html).toContain("settings-page-breadcrumb");
    expect(html).toContain("settings-page-title");
    expect(html).toContain("settings-page-copy");
  });

  it("resets the embedded settings scroller when switching sections", () => {
    expect(script).toContain('const mainScroller = document.querySelector(".settings-main");');
    expect(script).toContain('mainScroller?.scrollTo({ top: 0, behavior: "auto" });');
  });
});
