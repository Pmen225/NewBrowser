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
import { runLivePanelCheck } from "./live-cdp-panel-check.mjs";

const ROOT = process.cwd();
const DEFAULT_BASE_URL = "https://the-internet.herokuapp.com";
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "output", "playwright", process.env.LIVE_BENCHMARK_OUTPUT_DIR?.trim() || "live-gemini-browser-course");
const UPLOAD_FIXTURE_PATH = path.join(ROOT, "scripts", "fixtures", "atlas-upload-check.txt");

const SCENARIOS = [
  {
    name: "checkboxes",
    targetUrl: `${DEFAULT_BASE_URL}/checkboxes`,
    prompt: "On this page, make sure checkbox 1 is checked and checkbox 2 is unchecked, then tell me the final state.",
    siteEvalSource: `() => ({
      c1: document.querySelectorAll('input[type="checkbox"]')[0]?.checked ?? null,
      c2: document.querySelectorAll('input[type="checkbox"]')[1]?.checked ?? null
    })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/checkboxes")) && siteEval?.c1 === true && siteEval?.c2 === false;
    },
    verifyAssistant(text) {
      const normalized = String(text || "").toLowerCase();
      return normalized.includes("checkbox 1") && normalized.includes("checked") && normalized.includes("checkbox 2") && normalized.includes("unchecked");
    }
  },
  {
    name: "dropdown",
    targetUrl: `${DEFAULT_BASE_URL}/dropdown`,
    prompt: "On this page, select Option 2 and tell me which option is selected.",
    siteEvalSource: `() => ({ value: document.querySelector('#dropdown')?.value ?? '' })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/dropdown")) && siteEval?.value === "2";
    },
    verifyAssistant(text) {
      return /option 2/i.test(String(text || ""));
    }
  },
  {
    name: "dynamic-controls",
    targetUrl: `${DEFAULT_BASE_URL}/dynamic_controls`,
    prompt: "On this page, remove the checkbox, enable the text field, type \"Atlas\", and tell me the final status message and field value.",
    siteEvalSource: `() => ({
      checkboxPresent: !!document.querySelector('#checkbox input[type="checkbox"]'),
      inputDisabled: document.querySelector('#input-example input')?.disabled ?? null,
      inputValue: document.querySelector('#input-example input')?.value ?? '',
      message: document.querySelector('#message')?.textContent?.trim() ?? ''
    })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/dynamic_controls"))
        && siteEval?.checkboxPresent === false
        && siteEval?.inputDisabled === false
        && siteEval?.inputValue === "Atlas"
        && /enabled/i.test(siteEval?.message ?? "");
    },
    verifyAssistant(text) {
      const normalized = String(text || "").toLowerCase();
      return normalized.includes("atlas") && normalized.includes("enabled");
    }
  },
  {
    name: "javascript-prompt",
    targetUrl: `${DEFAULT_BASE_URL}/javascript_alerts`,
    prompt: "On this page, trigger the JS Prompt, enter \"Atlas\", accept it, and tell me the result text.",
    siteEvalSource: `() => ({ result: document.querySelector('#result')?.textContent?.trim() ?? '' })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/javascript_alerts")) && siteEval?.result === "You entered: Atlas";
    },
    verifyAssistant(text) {
      return /you entered:\s*atlas/i.test(String(text || ""));
    }
  },
  {
    name: "inputs",
    targetUrl: `${DEFAULT_BASE_URL}/inputs`,
    prompt: "Set the number field on this page to 42 and tell me the final value.",
    siteEvalSource: `() => ({ value: document.querySelector('input')?.value ?? '' })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/inputs")) && siteEval?.value === "42";
    },
    verifyAssistant(text) {
      return /42/.test(String(text || ""));
    }
  },
  {
    name: "file-upload",
    targetUrl: `${DEFAULT_BASE_URL}/upload`,
    prompt: `Upload the file "${UPLOAD_FIXTURE_PATH}" on this page and tell me the uploaded filename.`,
    siteEvalSource: `() => ({
      heading: document.querySelector('h3')?.textContent?.trim() ?? '',
      uploaded: document.querySelector('#uploaded-files')?.textContent?.trim() ?? ''
    })`,
    verifyDom(siteEval, site) {
      return Boolean(site?.url?.includes("/upload"))
        && /file uploaded!/i.test(siteEval?.heading ?? "")
        && siteEval?.uploaded === "atlas-upload-check.txt";
    },
    verifyAssistant(text) {
      return /atlas-upload-check\.txt/i.test(String(text || ""));
    }
  }
];

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

  const modelsToRun = parseModels();
  const excludedVisibleModels = GOOGLE_VISIBLE_MODEL_IDS.filter((modelId) => !GOOGLE_BROWSER_BENCHMARK_MODEL_IDS.includes(modelId));
  const modelSummaries = [];

  for (const modelId of modelsToRun) {
    const modelSlug = slugifyModelId(modelId);
    const modelDir = path.join(DEFAULT_OUTPUT_ROOT, modelSlug);
    mkdirSync(modelDir, { recursive: true });

    const results = [];
    for (const [index, scenario] of SCENARIOS.entries()) {
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
    benchmarkKind: "gemini-browser-control-course",
    searchExcluded: true,
    baseUrl: DEFAULT_BASE_URL,
    scenarios: SCENARIOS.map((scenario) => scenario.name),
    modelsTested: modelsToRun,
    visibleButExcludedModels: excludedVisibleModels,
    summaries: modelSummaries,
    recommendation
  };

  writeFileSync(path.join(DEFAULT_OUTPUT_ROOT, "summary.json"), JSON.stringify(aggregate, null, 2));
  console.log(JSON.stringify(aggregate, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
