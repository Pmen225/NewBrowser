import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const overlayPath = path.join(ROOT, "extension", "content", "agent-overlay.js");
const overlayJs = readFileSync(overlayPath, "utf8");
const panelJs = readFileSync(path.join(ROOT, "extension", "panel.js"), "utf8");
const bgJs = readFileSync(path.join(ROOT, "extension", "background.js"), "utf8");

describe("atlas overlay surface", () => {
  it("keeps the browser takeover script syntactically valid", () => {
    expect(() =>
      execFileSync(process.execPath, ["--check", overlayPath], {
        encoding: "utf8",
        stdio: "pipe",
      })
    ).not.toThrow();
  });

  it("keeps the on-page overlay layers and cursor affordances wired in", () => {
    expect(overlayJs).toContain("#atlas-glow");
    expect(overlayJs).toContain("#atlas-dots");
    expect(overlayJs).toContain("#atlas-cursor");
    expect(overlayJs).toContain("#atlas-label");
    expect(overlayJs).toContain("spawnRipple");
    expect(overlayJs).toContain("showStroke");
    expect(overlayJs).toContain("scheduleCursorIdleMotion");
    expect(overlayJs).toContain("applyCursorPosition");
  });

  it("anchors the floating label away from the highlighted target rect when possible", () => {
    expect(overlayJs).toContain("let currentAnchorRect = null;");
    expect(overlayJs).toContain("currentAnchorRect = normalizedRect;");
    expect(overlayJs).toContain("const canPlaceAbove = rect.y - labelHeight - gap >= safe;");
    expect(overlayJs).toContain("const canPlaceBelow = rect.y + rect.h + labelHeight + gap <= viewportHeight - safe;");
  });

  it("keeps the takeover bar and control actions on the browsing surface", () => {
    expect(overlayJs).not.toContain("atlas-bar-progress");
    expect(overlayJs).not.toContain("Agent is using your accounts");
    expect(overlayJs).not.toContain("Logged in");
    expect(overlayJs).toContain("Take control");
    expect(overlayJs).toContain("Stop");
    expect(overlayJs).toContain("ATLAS_CONTROL");
    expect(overlayJs).toContain("ATLAS_CONTROL_STATE");
    expect(overlayJs).toContain("Browser control active");
  });

  it("marks browser-controlled tabs through the background workspace", () => {
    expect(bgJs).toContain("activeControlTabs");
    expect(bgJs).toContain("registerActiveControlTab");
    expect(bgJs).toContain("unregisterActiveControlTab");
    expect(overlayJs).toContain('const CONTROLLED_TAB_TITLE_PREFIX = "AI · "');
    expect(overlayJs).toContain("syncControlledTabTitle()");
    expect(overlayJs).toContain("disableControlledTabTitle()");
  });

  it("emits distinct reading and extracting phases from the sidecar", () => {
    expect(panelJs).toContain('if (toolName === "read_page") return "reading";');
    expect(panelJs).toContain('if (toolName === "get_page_text") return "extracting";');
  });
});
