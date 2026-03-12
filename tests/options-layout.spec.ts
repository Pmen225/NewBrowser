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
      "web-browsing-reset-btn",
      "web-browsing-reset-status",
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
      "developer-mode-toggle",
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
      "dev",
      "agent-mode-runtime",
      "agent-mode-commands"
    ];

    for (const id of requiredIds) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("uses the reorganised page categories with a hidden developer tab", () => {
    expect(html).toContain('data-page="general"');
    expect(html).toContain('data-page="web-browsing"');
    expect(html).toContain('data-page="personalization"');
    expect(html).toContain('data-page="data-controls"');
    expect(html).toContain('data-page="dev"');
    expect(html).toContain(">General<");
    expect(html).toContain(">Web Browsing<");
    expect(html).toContain(">Personalisation<");
    expect(html).toContain(">Data Controls<");
    expect(html).toContain(">Dev<");
    expect(html).toContain('id="developer-mode-toggle"');
    expect(html).toContain("Developer mode");
  });

  it("keeps user-facing browsing controls out of the dev section", () => {
    const webBrowsingStart = html.indexOf('id="web-browsing"');
    const webBrowsingEnd = html.indexOf("</section>", webBrowsingStart);
    const webBrowsingSlice = html.slice(webBrowsingStart, webBrowsingEnd + 10);
    expect(webBrowsingSlice).toContain("Web search");
    expect(webBrowsingSlice).toContain("Reset to defaults");
    expect(webBrowsingSlice).not.toContain("Browser admin pages");
    expect(webBrowsingSlice).not.toContain("Extension management");
  });

  it("wires a reset-to-defaults path for web browsing controls", () => {
    expect(script).toContain("webBrowsingResetBtn");
    expect(script).toContain("webBrowsingResetStatus");
    expect(script).toContain("resetWebBrowsingModelConfig");
    expect(script).toContain("Web Browsing settings reset to defaults.");
  });

  it("scopes advanced controls under the dev section", () => {
    const devStart = html.indexOf('id="dev"');
    const devEnd = html.indexOf("</section>\n\n      <section id=\"agent-mode-runtime\"", devStart);
    const devSlice = html.slice(devStart, devEnd + 10);
    expect(devSlice).toContain("Browser admin pages");
    expect(devSlice).toContain("Extension management");
    expect(devSlice).toContain("Local workspace access");
    expect(devSlice).toContain("Agent behaviour and permissions");
    expect(devSlice).toContain("Commands");
    expect(devSlice).not.toContain("Provider access");
    expect(devSlice).not.toContain("Recent chats");
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
