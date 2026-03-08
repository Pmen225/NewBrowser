import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("extension/options.css", "utf8");

function collectMatches(source: string, regex: RegExp): string[] {
  const matches: string[] = [];
  for (const match of source.matchAll(regex)) {
    matches.push(match[1]);
  }
  return matches;
}

describe("options css integrity", () => {
  it("does not contain merge conflict markers", () => {
    expect(css.includes("<<<<<<<")).toBe(false);
    expect(css.includes("=======")).toBe(false);
    expect(css.includes(">>>>>>>")).toBe(false);
  });

  it("does not reference undefined css variables", () => {
    const defined = new Set(collectMatches(css, /--([A-Za-z0-9_-]+)\s*:/g));
    const used = new Set(collectMatches(css, /var\(--([A-Za-z0-9_-]+)/g));
    const undefinedVars = [...used].filter((name) => !defined.has(name)).sort();
    expect(undefinedVars).toEqual([]);
  });

  it("keeps atlas-style shell and page primitives styled", () => {
    expect(css).toContain(".settings-shell");
    expect(css).toContain(".settings-sidebar");
    expect(css).toContain(".settings-nav-item");
    expect(css).toContain(".settings-page");
    expect(css).toContain(".settings-page-header");
    expect(css).toContain(".settings-card");
    expect(css).toContain(".settings-list");
    expect(css).toContain(".settings-field");
    expect(css).toContain(".settings-button");
  });

  it("supports explicit light and dark theme rendering", () => {
    expect(css).toContain(':root[data-ui-theme="dark"]');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain("color-scheme: light");
  });

  it("supports compact embedded side-panel mode", () => {
    expect(css).toContain('body[data-embedded="panel"]');
    expect(css).toContain('body[data-embedded="panel"] .settings-shell');
    expect(css).toContain('body[data-embedded="panel"] .settings-sidebar');
    expect(css).toContain('body[data-embedded="panel"] .settings-nav');
    expect(css).toContain('body[data-embedded="panel"] .settings-main');
    expect(css).toContain('body[data-embedded="panel"] {\n  min-height: 100dvh;');
    expect(css).toContain('background: var(--window-bg);');
    expect(css).toContain('--window-bg:');
    expect(css).toContain('--panel-bg:');
    expect(css).toContain('body[data-embedded="panel"] .nav-icon {\n  display: none;');
    expect(css).toContain('body[data-embedded="panel"] .settings-nav {\n  flex-direction: row;\n  flex-wrap: nowrap;');
    expect(css).toContain('overflow-x: auto;');
    expect(css).toContain('width: 100%;');
    expect(css).toContain('min-width: 0;');
    expect(css).toContain('white-space: nowrap;');
  });
});
