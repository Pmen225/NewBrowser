import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("surface removal", () => {
  it("keeps the extension settings page entrypoint", async () => {
    const rootDir = process.cwd();
    const manifest = await readFile(resolve(rootDir, "extension/manifest.json"), "utf8");

    expect(manifest).toContain('"options_ui"');
    expect(manifest).toContain('"page": "options.html"');
  });

  it("removes the standalone sidecar browser UI entrypoint", async () => {
    const rootDir = process.cwd();
    const server = await readFile(resolve(rootDir, "sidecar/src/server.ts"), "utf8");

    expect(server).not.toContain('import { createSidecarUiHtml } from "./http/ui";');
    expect(server).not.toContain('url === "/" || url === "/ui"');
    expect(server).not.toContain("createSidecarUiHtml(");
  });

  it("keeps live settings entrypoints in the pinned panel", async () => {
    const rootDir = process.cwd();
    const [{ buildPanelShellMarkup }, script] = await Promise.all([
      import("../../extension/panel.js"),
      readFile(resolve(rootDir, "extension/panel.js"), "utf8")
    ]);
    const shell = buildPanelShellMarkup();

    expect(shell).toContain('id="settings-btn"');
    expect(shell).toContain('aria-label="Settings"');
    expect(script).toContain("openOptionsPage");
    expect(script).toContain('settingsButton?.addEventListener("click"');
  });
});
