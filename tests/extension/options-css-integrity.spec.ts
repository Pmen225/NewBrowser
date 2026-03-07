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
    const undefinedVars = [...used].filter(name => !defined.has(name)).sort();
    expect(undefinedVars).toEqual([]);
  });

  it("keeps settings shell primitives styled", () => {
    expect(css).toContain(".settings-shell");
    expect(css).toContain(".settings-sidebar");
    expect(css).toContain(".settings-main");
    expect(css).toContain(".settings-section");
    expect(css).toContain(".settings-advanced");
    expect(css).toContain(".settings-toggle-track");
  });
});
