import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { readFile as readFileCallback } from "node:fs/promises";
import path from "node:path";

import type { ProviderBenchmarkBrowserControlResult } from "../../../shared/src/transport";
import { normalizeCatalogModelId } from "../../../extension/lib/model-config.js";

const execFile = promisify(execFileCallback);

function slugifyModelId(modelId: string): string {
  return normalizeCatalogModelId("google", modelId).replace(/[^a-z0-9.-]+/gi, "-");
}

function classifyPolicyStatus(summary: {
  passCount: number;
  totalCount: number;
  hardFailureCount: number;
}): "approved" | "experimental" | "blocked" {
  if (summary.totalCount > 0 && summary.passCount === summary.totalCount && summary.hardFailureCount === 0) {
    return "approved";
  }
  if (summary.hardFailureCount > 0) {
    return "blocked";
  }
  return "experimental";
}

export function summarizeBrowserControlAggregate({
  provider,
  modelId,
  outputDir,
  summaryPath,
  aggregate
}: {
  provider: "google";
  modelId: string;
  outputDir: string;
  summaryPath: string;
  aggregate: {
    generatedAt?: string;
    benchmarkKind?: string;
    searchExcluded?: boolean;
    summaries?: Array<{
      modelId?: string;
      costTier?: "lowest" | "low" | "medium" | "high";
      passCount?: number;
      totalCount?: number;
      hardFailureCount?: number;
      medianElapsedMs?: number;
      results?: Array<{ failureMode?: string | null }>;
    }>;
  };
}): ProviderBenchmarkBrowserControlResult {
  const canonicalModelId = normalizeCatalogModelId("google", modelId);
  const modelSummary = Array.isArray(aggregate?.summaries)
    ? aggregate.summaries.find((entry) => normalizeCatalogModelId("google", entry?.modelId ?? "") === canonicalModelId)
    : null;

  if (!modelSummary) {
    throw new Error(`Benchmark summary did not include ${canonicalModelId}.`);
  }

  const failureModes = [...new Set(
    Array.isArray(modelSummary.results)
      ? modelSummary.results
        .map((entry) => (typeof entry?.failureMode === "string" && entry.failureMode.trim().length > 0 ? entry.failureMode : null))
        .filter(Boolean)
      : []
  )];

  const summary = {
    model_id: canonicalModelId,
    cost_tier: modelSummary.costTier === "lowest" || modelSummary.costTier === "low" || modelSummary.costTier === "medium" || modelSummary.costTier === "high"
      ? modelSummary.costTier
      : "medium",
    pass_count: Number.isFinite(modelSummary.passCount) ? Math.max(0, Math.round(modelSummary.passCount)) : 0,
    total_count: Number.isFinite(modelSummary.totalCount) ? Math.max(0, Math.round(modelSummary.totalCount)) : 0,
    hard_failure_count: Number.isFinite(modelSummary.hardFailureCount) ? Math.max(0, Math.round(modelSummary.hardFailureCount)) : 0,
    median_elapsed_ms: Number.isFinite(modelSummary.medianElapsedMs) ? Math.max(0, Math.round(modelSummary.medianElapsedMs)) : 0,
    failure_modes: failureModes
  };

  return {
    provider,
    model_id: canonicalModelId,
    benchmark_kind: typeof aggregate?.benchmarkKind === "string" && aggregate.benchmarkKind.trim().length > 0
      ? aggregate.benchmarkKind
      : "gemini-browser-control-course",
    generated_at: typeof aggregate?.generatedAt === "string" && aggregate.generatedAt.trim().length > 0
      ? aggregate.generatedAt
      : new Date().toISOString(),
    search_excluded: aggregate?.searchExcluded !== false,
    policy_status: classifyPolicyStatus({
      passCount: summary.pass_count,
      totalCount: summary.total_count,
      hardFailureCount: summary.hard_failure_count
    }),
    output_dir: outputDir,
    summary_path: summaryPath,
    summary
  };
}

export function createBrowserControlBenchmarkRunner({
  cwd = process.cwd(),
  now = () => Date.now(),
  execFile: runExecFile = execFile,
  readFile = readFileCallback
}: {
  cwd?: string;
  now?: () => number;
  execFile?: typeof execFile;
  readFile?: (pathValue: string, encoding: BufferEncoding) => Promise<string>;
} = {}) {
  return async function runBrowserControlBenchmark({
    provider,
    model_id
  }: {
    provider: "openai" | "anthropic" | "google" | "deepseek";
    model_id: string;
  }): Promise<ProviderBenchmarkBrowserControlResult> {
    if (provider !== "google") {
      throw new Error("Browser-control benchmark is only implemented for google models.");
    }

    const canonicalModelId = normalizeCatalogModelId(provider, model_id);
    const outputDirName = `live-gemini-browser-course-${slugifyModelId(canonicalModelId)}-${now()}`;
    const scriptPath = path.join(cwd, "scripts", "live-gemini-browser-course.mjs");
    const outputDir = path.join(cwd, "output", "playwright", outputDirName);
    const summaryPath = path.join(outputDir, "summary.json");

    await runExecFile(process.execPath, [scriptPath], {
      cwd,
      env: {
        ...process.env,
        LIVE_MODEL: canonicalModelId,
        LIVE_BENCHMARK_OUTPUT_DIR: outputDirName
      },
      maxBuffer: 10 * 1024 * 1024
    });

    const rawSummary = await readFile(summaryPath, "utf8");
    const aggregate = JSON.parse(rawSummary);
    return summarizeBrowserControlAggregate({
      provider,
      modelId: canonicalModelId,
      outputDir,
      summaryPath,
      aggregate
    });
  };
}
