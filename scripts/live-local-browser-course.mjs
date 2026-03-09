import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  GOOGLE_BROWSER_BENCHMARK_MODEL_IDS,
  GOOGLE_VISIBLE_MODEL_IDS,
  chooseBrowserControlBenchmarkWinner,
  createCatalogEntry
} from "../extension/lib/model-config.js";
import { normalizeGoogleModelId, resolveLiveModelSelection } from "./lib/live-cdp-config.js";
import { buildLocalBrowserCourseScenarios, createLocalBrowserCourseServer } from "./lib/local-browser-course.js";
import { runLivePanelCheck } from "./live-cdp-panel-check.mjs";

const ROOT = process.cwd();
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "output", "playwright", process.env.LIVE_BENCHMARK_OUTPUT_DIR?.trim() || "live-local-browser-course");
const UPLOAD_FIXTURE_PATH = path.join(ROOT, "scripts", "fixtures", "atlas-upload-check.txt");

function slugifyModelId(modelId) {
  return normalizeGoogleModelId(modelId).replace(/^models\//, "").replace(/[^a-z0-9.-]+/gi, "-");
}

function parseModels() {
  const explicitSingle = process.env.LIVE_MODEL?.trim();
  if (explicitSingle) {
    return [normalizeGoogleModelId(explicitSingle)];
  }

  const explicitList = process.env.LIVE_MODELS?.trim();
  if (explicitList) {
    return explicitList
      .split(",")
      .map((item) => normalizeGoogleModelId(item))
      .filter(Boolean);
  }

  if (process.env.LIVE_BENCHMARK_ALL === "1") {
    return [...GOOGLE_BROWSER_BENCHMARK_MODEL_IDS];
  }

  return [resolveLiveModelSelection().modelId];
}

function classifyFailure(report, scenario, error) {
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/http 400|provider_http_error|provider auth|provider_empty_response/i.test(message)) {
      return { status: "hard_fail", failureMode: "provider_http_error", hardFailure: true, detail: message };
    }
    if (/timed out waiting for assistant result|timed out after/i.test(message)) {
      return { status: "hard_fail", failureMode: "timeout", hardFailure: true, detail: message };
    }
    return { status: "hard_fail", failureMode: "runner_error", hardFailure: true, detail: message };
  }

  const assistantText = String(report?.panel?.assistantText || "");
  const combinedPanelText = [assistantText, ...(report?.panel?.toasts ?? [])].join(" ");
  if (/http 400|provider_http_error|provider_empty_response/i.test(combinedPanelText)) {
    return { status: "hard_fail", failureMode: "provider_http_error", hardFailure: true, detail: combinedPanelText };
  }

  const domPass = scenario.verifyDom(report?.siteEval, report?.site);
  const answerPass = scenario.verifyAssistant(assistantText, report?.siteEval, report?.site);
  const wrongSiteEscape = !String(report?.site?.url || "").startsWith(scenario.targetUrl);

  if (wrongSiteEscape) {
    return { status: "hard_fail", failureMode: "wrong_site_escape", hardFailure: true, detail: report?.site?.url || "" };
  }
  if (!domPass) {
    return { status: "fail", failureMode: "dom_mismatch", hardFailure: false, detail: JSON.stringify(report?.siteEval ?? null) };
  }
  if (!answerPass) {
    return { status: "fail", failureMode: "answer_mismatch", hardFailure: false, detail: assistantText };
  }

  return { status: "pass", failureMode: null, hardFailure: false, detail: "" };
}

async function runScenario(modelId, scenario, outputDir) {
  try {
    const report = await runLivePanelCheck({
      targetUrl: scenario.targetUrl,
      prompt: scenario.prompt,
      siteEvalSource: scenario.siteEvalSource,
      outputDir,
      provider: "google",
      modelId
    });

    const classification = classifyFailure(report, scenario, null);
    return {
      modelId,
      scenario: scenario.name,
      targetUrl: scenario.targetUrl,
      outputDir,
      elapsedMs: report.elapsedMs ?? 0,
      panelText: report.panel?.assistantText ?? "",
      siteUrl: report.site?.url ?? "",
      siteEval: report.siteEval ?? null,
      ...classification
    };
  } catch (error) {
    const classification = classifyFailure(null, scenario, error);
    return {
      modelId,
      scenario: scenario.name,
      targetUrl: scenario.targetUrl,
      outputDir,
      elapsedMs: 0,
      panelText: "",
      siteUrl: "",
      siteEval: null,
      ...classification
    };
  }
}

function summarizeModel(modelId, results) {
  const entry = createCatalogEntry("google", modelId);
  const elapsed = results.map((result) => result.elapsedMs).filter((value) => value > 0).sort((left, right) => left - right);
  const medianElapsedMs = elapsed.length === 0 ? 0 : elapsed[Math.floor(elapsed.length / 2)];
  return {
    modelId,
    costTier: entry.costTier,
    passCount: results.filter((result) => result.status === "pass").length,
    totalCount: results.length,
    hardFailureCount: results.filter((result) => result.hardFailure).length,
    medianElapsedMs,
    results
  };
}

async function main() {
  mkdirSync(DEFAULT_OUTPUT_ROOT, { recursive: true });
  const server = await createLocalBrowserCourseServer();

  try {
    const scenarios = buildLocalBrowserCourseScenarios({
      baseUrl: server.baseUrl,
      uploadFixturePath: UPLOAD_FIXTURE_PATH
    });
    const modelsToRun = parseModels();
    const excludedVisibleModels = GOOGLE_VISIBLE_MODEL_IDS.filter((modelId) => !GOOGLE_BROWSER_BENCHMARK_MODEL_IDS.includes(modelId));
    const modelSummaries = [];

    for (const modelId of modelsToRun) {
      const modelSlug = slugifyModelId(modelId);
      const modelDir = path.join(DEFAULT_OUTPUT_ROOT, modelSlug);
      mkdirSync(modelDir, { recursive: true });

      const results = [];
      for (const [index, scenario] of scenarios.entries()) {
        const scenarioDir = path.join(modelDir, `${String(index + 1).padStart(2, "0")}-${scenario.name}`);
        mkdirSync(scenarioDir, { recursive: true });
        const result = await runScenario(modelId, scenario, scenarioDir);
        results.push(result);
        writeFileSync(path.join(scenarioDir, "benchmark-result.json"), JSON.stringify(result, null, 2));
      }

      const summary = summarizeModel(modelId, results);
      modelSummaries.push(summary);
      writeFileSync(path.join(modelDir, "summary.json"), JSON.stringify(summary, null, 2));
    }

    const recommendation = chooseBrowserControlBenchmarkWinner(modelSummaries);
    const aggregate = {
      generatedAt: new Date().toISOString(),
      benchmarkKind: "local-browser-control-course",
      searchExcluded: true,
      baseUrl: server.baseUrl,
      scenarios: scenarios.map((scenario) => scenario.name),
      modelsTested: modelsToRun,
      visibleButExcludedModels: excludedVisibleModels,
      summaries: modelSummaries,
      recommendation
    };

    writeFileSync(path.join(DEFAULT_OUTPUT_ROOT, "summary.json"), JSON.stringify(aggregate, null, 2));
    console.log(JSON.stringify(aggregate, null, 2));
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
