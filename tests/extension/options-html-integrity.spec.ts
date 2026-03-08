import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("extension/options.html", "utf8");

function extractIds(markup: string): string[] {
  const ids: string[] = [];
  const idRegex = /\sid="([^"]+)"/g;
  for (const match of markup.matchAll(idRegex)) {
    ids.push(match[1]);
  }
  return ids;
}

describe("options html integrity", () => {
  it("does not contain merge conflict markers", () => {
    expect(html.includes("<<<<<<<")).toBe(false);
    expect(html.includes("=======")).toBe(false);
    expect(html.includes(">>>>>>>")).toBe(false);
  });

  it("does not duplicate id attributes", () => {
    const ids = extractIds(html);
    const counts = new Map<string, number>();
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
    expect(duplicates).toEqual([]);
  });
});
