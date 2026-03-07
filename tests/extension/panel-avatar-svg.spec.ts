import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("panel ai avatar svg class updates", () => {
  it("updates svg avatar classes via setAttribute instead of direct className assignment", () => {
    const script = readFileSync(path.join(ROOT, "extension", "panel.js"), "utf8");
    expect(script).toContain("gc.setAttribute(\"class\",");
    expect(script).not.toContain("gc.className =");
  });
});
