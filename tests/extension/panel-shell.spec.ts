import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("generated extension manifest", () => {
  it("stays on the standard MV3 side panel contract without BrowserOS-only permissions", () => {
    const manifestPath = path.join(ROOT, "extension", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.side_panel).toEqual({ default_path: "panel.html" });
    expect(manifest.permissions).toEqual(expect.arrayContaining(["sidePanel", "tabs", "activeTab", "storage", "scripting"]));
    expect(manifest.host_permissions).toEqual(expect.arrayContaining([
      "http://127.0.0.1:3210/*",
      "http://localhost:3210/*",
      "ws://127.0.0.1:3210/*",
      "ws://localhost:3210/*"
    ]));
    expect(manifest.action).toEqual({ default_title: "Open Assistant" });
    expect(manifest.options_ui).toEqual({ page: "options.html", open_in_tab: true });
    const contentScripts = manifest.content_scripts.flatMap((entry: { js?: string[] }) => entry.js ?? []);
    expect(contentScripts).toContain("content/page-targets.js");
    expect(contentScripts).not.toContain("content/page-button.js");
    expect(manifest.permissions).not.toContain("browserOS");
    expect(manifest).not.toHaveProperty("chrome_url_overrides");
    expect(manifest).not.toHaveProperty("update_url");
    expect(manifest).not.toHaveProperty("externally_connectable");
  });
});
