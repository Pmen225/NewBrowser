import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createLocalBrowserCourseServer } from "./lib/local-browser-course.js";
import {
  loadMind2WebTaskSet,
  resolvePreparedMind2WebTaskPath
} from "./lib/mind2web-fixtures.js";
import { runLivePanelCheck } from "./live-cdp-panel-check.mjs";

const ROOT = process.cwd();
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "output", "playwright", process.env.MIND2WEB_OUTPUT_DIR?.trim() || "mind2web-local-eval");

function normalizeAssistantText(text) {
  return String(text || "").toLowerCase();
}

function classifyTask(report, task, error) {
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "hard_fail",
      failureMode: /timed out/i.test(message) ? "timeout" : "runner_error",
      hardFailure: true,
      detail: message
    };
  }

  const siteEval = report?.siteEval ?? null;
  const expectedEval = task?.expected?.siteEval && typeof task.expected.siteEval === "object" ? task.expected.siteEval : {};
  const domPass = Object.entries(expectedEval).every(([key, value]) => siteEval?.[key] === value);
  const assistantText = String(report?.panel?.assistantText || "");
  const assistantPass = Array.isArray(task?.expected?.assistantIncludes)
    ? task.expected.assistantIncludes.every((needle) => normalizeAssistantText(assistantText).includes(String(needle || "").toLowerCase()))
    : true;

  if (!domPass) {
    return {
      status: "fail",
      failureMode: "dom_mismatch",
      hardFailure: false,
      detail: JSON.stringify(siteEval)
    };
  }
  if (!assistantPass) {
    return {
      status: "fail",
      failureMode: "answer_mismatch",
      hardFailure: false,
      detail: assistantText
    };
  }

  return {
    status: "pass",
    failureMode: null,
    hardFailure: false,
    detail: ""
  };
}

async function main() {
  mkdirSync(DEFAULT_OUTPUT_ROOT, { recursive: true });
  const taskFile = resolvePreparedMind2WebTaskPath({ root: ROOT });
  const taskSet = loadMind2WebTaskSet(taskFile);
  const server = await createLocalBrowserCourseServer();

  try {
    const results = [];

    for (const [index, task] of taskSet.tasks.entries()) {
      const outputDir = path.join(DEFAULT_OUTPUT_ROOT, `${String(index + 1).padStart(2, "0")}-${task.taskId}`);
      mkdirSync(outputDir, { recursive: true });
      const targetUrl = typeof task.startUrl === "string" && task.startUrl.length > 0
        ? task.startUrl
        : `${server.baseUrl}${task.startPath}`;

      try {
        const report = await runLivePanelCheck({
          targetUrl,
          prompt: task.confirmedTask,
          siteEvalSource: task.siteEvalSource,
          outputDir,
          provider: process.env.LIVE_PROVIDER?.trim() || "google",
          modelId: process.env.LIVE_MODEL?.trim() || ""
        });
        const classification = classifyTask(report, task, null);
        const result = {
          taskId: task.taskId,
          website: task.website,
          domain: task.domain,
          confirmedTask: task.confirmedTask,
          targetUrl,
          outputDir,
          elapsedMs: report.elapsedMs ?? 0,
          panelText: report.panel?.assistantText ?? "",
          siteEval: report.siteEval ?? null,
          ...classification
        };
        results.push(result);
        writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
      } catch (error) {
        const classification = classifyTask(null, task, error);
        const result = {
          taskId: task.taskId,
          website: task.website,
          domain: task.domain,
          confirmedTask: task.confirmedTask,
          targetUrl,
          outputDir,
          elapsedMs: 0,
          panelText: "",
          siteEval: null,
          ...classification
        };
        results.push(result);
        writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      benchmarkKind: taskSet.benchmark,
      taskFile,
      totalCount: results.length,
      passCount: results.filter((result) => result.status === "pass").length,
      hardFailureCount: results.filter((result) => result.hardFailure).length,
      results
    };

    writeFileSync(path.join(DEFAULT_OUTPUT_ROOT, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
