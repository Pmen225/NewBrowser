import { describe, expect, it, vi } from "vitest";

import {
  createBrowserControlBenchmarkRunner,
  summarizeBrowserControlAggregate
} from "../../sidecar/src/bench/browser-model-benchmark";

describe("browser model benchmark runner", () => {
  it("summarizes a passing aggregate as approved", () => {
    const result = summarizeBrowserControlAggregate({
      provider: "google",
      modelId: "models/gemini-2.5-flash",
      outputDir: "/tmp/live-gemini-browser-course-1",
      summaryPath: "/tmp/live-gemini-browser-course-1/summary.json",
      aggregate: {
        generatedAt: "2026-03-06T15:00:00.000Z",
        benchmarkKind: "gemini-browser-control-course",
        searchExcluded: true,
        summaries: [
          {
            modelId: "models/gemini-2.5-flash",
            costTier: "low",
            passCount: 6,
            totalCount: 6,
            hardFailureCount: 0,
            medianElapsedMs: 11_000,
            results: []
          }
        ]
      }
    });

    expect(result).toEqual(expect.objectContaining({
      provider: "google",
      model_id: "models/gemini-2.5-flash",
      policy_status: "approved",
      summary: expect.objectContaining({
        pass_count: 6,
        total_count: 6,
        hard_failure_count: 0
      })
    }));
  });

  it("runs the existing live benchmark script and parses the summary output", async () => {
    const execFile = vi.fn(async () => ({ stdout: "", stderr: "" }));
    const readFile = vi.fn(async () => JSON.stringify({
      generatedAt: "2026-03-06T15:30:00.000Z",
      benchmarkKind: "gemini-browser-control-course",
      searchExcluded: true,
      summaries: [
        {
          modelId: "models/gemini-flash-latest",
          costTier: "low",
          passCount: 6,
          totalCount: 6,
          hardFailureCount: 0,
          medianElapsedMs: 10_000,
          results: [
            { failureMode: null },
            { failureMode: null }
          ]
        }
      ]
    }));

    const runner = createBrowserControlBenchmarkRunner({
      cwd: "/repo",
      now: () => 1_777_777_777_777,
      execFile,
      readFile
    });

    const result = await runner({
      provider: "google",
      model_id: "models/gemini-flash-latest"
    });

    expect(execFile).toHaveBeenCalledWith(
      process.execPath,
      ["/repo/scripts/live-gemini-browser-course.mjs"],
      expect.objectContaining({
        cwd: "/repo",
        env: expect.objectContaining({
          LIVE_MODEL: "models/gemini-flash-latest"
        })
      })
    );
    expect(readFile).toHaveBeenCalledWith(
      "/repo/output/playwright/live-gemini-browser-course-models-gemini-flash-latest-1777777777777/summary.json",
      "utf8"
    );
    expect(result.policy_status).toBe("approved");
  });
});
