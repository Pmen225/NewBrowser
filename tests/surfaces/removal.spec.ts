import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("surface removal", () => {
  it("removes the standalone extension settings tab entrypoint", async () => {
    const rootDir = process.cwd();
    const manifest = await readFile(resolve(rootDir, "extension/manifest.json"), "utf8");

    expect(manifest).not.toContain('"options_ui"');
  });

  it("removes the standalone sidecar browser UI entrypoint", async () => {
    const rootDir = process.cwd();
    const server = await readFile(resolve(rootDir, "sidecar/src/server.ts"), "utf8");

    expect(server).not.toContain('import { createSidecarUiHtml } from "./http/ui";');
    expect(server).not.toContain('url === "/" || url === "/ui"');
    expect(server).not.toContain("createSidecarUiHtml(");
  });

  it("keeps embedded settings inside the panel shell", async () => {
    const rootDir = process.cwd();
    const [{ buildPanelShellMarkup }, script] = await Promise.all([
      import("../../extension/panel.js"),
      readFile(resolve(rootDir, "extension/panel.js"), "utf8")
    ]);
    const shell = buildPanelShellMarkup();

    expect(shell).toContain('id="settings-view"');
    expect(shell).toContain('id="settings-frame"');
    expect(script).toContain("buildSettingsFrameUrl");
    expect(script).toContain("openSettingsPage");
  });
});
