import { describe, expect, it } from "vitest";

import { parseJsonl } from "./jsonl";

describe("parseJsonl", () => {
  it("parses non-empty JSONL lines", () => {
    const parsed = parseJsonl<{ value: number }>("{\"value\":1}\n\n{\"value\":2}\n");

    expect(parsed).toEqual([{ value: 1 }, { value: 2 }]);
  });

  it("throws when a line is not valid JSON", () => {
    expect(() => parseJsonl("{\"value\":1}\nnot-json\n")).toThrow();
  });
});
