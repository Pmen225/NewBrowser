import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("system prompt contract", () => {
  it("keeps the base agent reasoning style analytical and low-fluff", () => {
    const prompt = readFileSync(path.join(ROOT, "REF DOCS", "System Prompt.txt"), "utf8");

    expect(prompt).toContain("reasons from first principles");
    expect(prompt).toContain("prefers evidence, mechanism, and direct observation");
    expect(prompt).toContain("examines issues deeply before concluding");
    expect(prompt).toContain("high standards for correctness");
    expect(prompt).toContain("unorthodox solutions when the evidence supports them");
    expect(prompt).toContain("collaborates without emotional padding");
    expect(prompt).toContain("does not mirror panic, flatter the user, or add motivational language");
    expect(prompt).toContain("change its mind quickly when new evidence disproves an earlier assumption");
  });
});
