import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("assistant panel shell contract", () => {
  it("keeps panel.html as a bootstrap shell and renders the live surface from panel.js", async () => {
    const html = readFileSync(path.join(ROOT, "extension", "panel.html"), "utf8");
    const { buildPanelShellMarkup } = await import("../../extension/panel.js");
    const shell = buildPanelShellMarkup();

    expect(html).toContain('<main id="root" aria-label="Assistant panel"></main>');
    expect(html).not.toContain('id="prompt-input"');

    expect(shell).toContain('class="assistant-shell"');
    expect(shell).toContain('id="empty-state"');
    expect(shell).toContain('id="empty-reconnect-btn"');
    expect(shell).toContain("Reconnect to sidecar");
    expect(shell).toContain('id="settings-btn"');
    expect(shell).toContain('aria-label="Settings"');
    expect(shell).toContain('id="prompt-input"');
    expect(shell).toContain('placeholder="Ask anything..."');
    expect(shell).toContain('aria-label="Ask anything"');
    expect(shell).toContain('id="btn-plus"');
    expect(shell).toContain('id="btn-model"');
    expect(shell).toContain('id="btn-mic"');
    expect(shell).toContain('id="btn-send"');
  });

  it("keeps the panel script and styles aligned with the current runtime shell", () => {
    const css = readFileSync(path.join(ROOT, "extension", "styles.css"), "utf8");
    const script = readFileSync(path.join(ROOT, "extension", "panel.js"), "utf8");

    expect(css).toContain(".assistant-shell");
    expect(css).toContain(".empty-reconnect-btn");
    expect(css).toContain(".thinking-row");
    expect(css).toContain(".action-log");
    expect(css).toContain(".sources-row");
    expect(css).toContain(".gamma-thinking");
    expect(css).toContain(".gamma-scanning");
    expect(css).toContain(".gamma-streaming");
    expect(css).toContain(".gamma-error");
    expect(css).toContain(".gamma-done");

    expect(script).toContain('const FULL_PROMPT_PLACEHOLDER = "Ask anything...";');
    expect(script).toContain('const PROMPT_ARIA_LABEL = "Ask anything";');
    expect(script).toContain("function buildPanelShellMarkup()");
    expect(script).toContain("async function openSettingsPage()");
    expect(script).toContain("function reconnectToSidecar()");
    expect(script).toContain('settingsButton?.addEventListener("click"');
    expect(script).toContain('emptyReconnectButton?.addEventListener("click"');
    expect(script).toContain("function appendActionItem");
    expect(script).toContain("function appendSources");
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-thinking")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-scanning")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-streaming")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-error")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-done")');
    expect(script).toContain("rpc.reconnect();");
    expect(script).toContain('const EVENTS_URL   = "http://127.0.0.1:3210/events";');
    expect(script).toContain('if (toolName === "read_page") return "reading";');
    expect(script).toContain('if (toolName === "get_page_text") return "extracting";');
    expect(script).toContain('type: "ATLAS_STATUS_UPDATE"');
    expect(script).toContain('rpc.call("AgentPause"');
    expect(script).toContain('rpc.call("AgentResume"');
    expect(script).toContain('type: "ATLAS_CONTROL_STATE"');
    expect(script).toContain('msg.action === "pause"');
    expect(script).toContain('msg.action === "resume"');
  });
});
