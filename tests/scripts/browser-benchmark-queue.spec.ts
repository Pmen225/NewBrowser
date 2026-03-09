import { describe, expect, it } from "vitest";

import { getOfficialBrowserBenchmarkQueue } from "../../scripts/lib/browser-benchmark-queue.js";

describe("official browser benchmark queue", () => {
  it("tracks the post-Online-Mind2Web benchmark expansion set in stable order", () => {
    const queue = getOfficialBrowserBenchmarkQueue();

    expect(queue.map((entry) => entry.id)).toEqual([
      "assistantbench",
      "webarena",
      "visualwebarena",
      "workarena"
    ]);
    expect(queue.every((entry) => entry.status === "queued")).toBe(true);
    expect(queue.every((entry) => /^https:\/\//.test(entry.upstream))).toBe(true);
  });
});
