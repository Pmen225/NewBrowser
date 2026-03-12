import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyBenchmarkRuntimeFailure,
  detectPlaywrightBootstrapFailure,
  extractFailureModeFromText,
  resolveBrowserCourseScenarioPreflight,
  resolvePlaywrightBootstrapReadiness,
  shouldFailBrowserCourseBenchmarkProcess
} from "../../scripts/lib/browser-course-bootstrap.cjs";

const ROOT = process.cwd();

describe("browser-course bootstrap readiness", () => {
  it("detects a playwright bootstrap failure detail", () => {
    const detail = detectPlaywrightBootstrapFailure(
      new Error("Playwright bootstrap probe failed in 15000ms; phase=load-playwright-core; code=ETIMEDOUT")
    );

    expect(detail).toContain("phase=load-playwright-core");
  });

  it("returns ready=false when bootstrap assertion throws", () => {
    const readiness = resolvePlaywrightBootstrapReadiness({
      assertReady: () => {
        const error = new Error("Playwright bootstrap probe failed in 15000ms; classification=runtime_bootstrap_timeout; phase=load-playwright; code=ETIMEDOUT") as Error & {
          classification?: string;
        };
        error.name = "PlaywrightBootstrapError";
        error.classification = "runtime_bootstrap_timeout";
        throw error;
      }
    });

    expect(readiness).toEqual({
      ready: false,
      detail: "Playwright bootstrap probe failed in 15000ms; classification=runtime_bootstrap_timeout; phase=load-playwright; code=ETIMEDOUT",
      failureMode: "runtime_bootstrap_timeout"
    });
  });

  it("returns ready=true when bootstrap assertion succeeds", () => {
    const readiness = resolvePlaywrightBootstrapReadiness({
      assertReady: () => undefined
    });

    expect(readiness).toEqual({
      ready: true,
      detail: "",
      failureMode: ""
    });
  });

  it("extracts classified failure mode tokens from runtime error text", () => {
    expect(
      extractFailureModeFromText(
        "loopback bind preflight failed; classification=loopback_bind_permission_failure; code=EPERM"
      )
    ).toBe("loopback_bind_permission_failure");

    expect(
      extractFailureModeFromText(
        "hard fail occurred; failureMode=process_inspection_permission_failure"
      )
    ).toBe("process_inspection_permission_failure");
  });

  it("classifies bootstrap errors using typed bootstrap classification", () => {
    const bootstrapError = new Error(
      "Playwright bootstrap probe failed in 15000ms; classification=runtime_bootstrap_timeout; phase=load-playwright-core; code=ETIMEDOUT"
    ) as Error & { classification?: string; name?: string };
    bootstrapError.name = "PlaywrightBootstrapError";
    bootstrapError.classification = "runtime_bootstrap_timeout";

    expect(classifyBenchmarkRuntimeFailure(bootstrapError)).toEqual({
      failureMode: "runtime_bootstrap_timeout",
      detail: "Playwright bootstrap probe failed in 15000ms; classification=runtime_bootstrap_timeout; phase=load-playwright-core; code=ETIMEDOUT"
    });
  });

  it("preserves non-bootstrap runtime classifications instead of collapsing to runner_error", () => {
    const error = Object.assign(new Error("spawn EPERM"), {
      classification: "process_inspection_permission_failure",
      code: "EPERM"
    });

    expect(classifyBenchmarkRuntimeFailure(error)).toEqual({
      failureMode: "process_inspection_permission_failure",
      detail: "spawn EPERM"
    });
  });

  it("keeps bootstrap diagnostics without blocking CDP scenario execution", () => {
    expect(resolveBrowserCourseScenarioPreflight({
      startupFailure: null,
      bootstrapReadiness: {
        ready: false,
        detail: "Playwright bootstrap probe failed in 15000ms",
        failureMode: "runtime_bootstrap_timeout"
      }
    })).toEqual({
      canRunScenarios: true,
      bootstrapReady: false,
      bootstrapFailure: "Playwright bootstrap probe failed in 15000ms",
      bootstrapFailureMode: "runtime_bootstrap_timeout"
    });
  });

  it("fails the benchmark process when every scenario is a hard failure", () => {
    expect(shouldFailBrowserCourseBenchmarkProcess({
      summaries: [
        { passCount: 0, totalCount: 6, hardFailureCount: 6 },
        { passCount: 0, totalCount: 6, hardFailureCount: 6 }
      ]
    })).toBe(true);

    expect(shouldFailBrowserCourseBenchmarkProcess({
      summaries: [
        { passCount: 1, totalCount: 6, hardFailureCount: 5 }
      ]
    })).toBe(false);
  });

  it("keeps local/public browser-course benchmarks recording bootstrap diagnostics", () => {
    const localScript = readFileSync(path.join(ROOT, "scripts", "live-local-browser-course.mjs"), "utf8");
    const publicScript = readFileSync(path.join(ROOT, "scripts", "live-gemini-browser-course.mjs"), "utf8");

    expect(localScript).toContain("resolveBrowserCourseScenarioPreflight");
    expect(localScript).toContain("shouldFailBrowserCourseBenchmarkProcess");
    expect(localScript).toContain("bootstrapReady");

    expect(publicScript).toContain("resolveBrowserCourseScenarioPreflight");
    expect(publicScript).toContain("shouldFailBrowserCourseBenchmarkProcess");
    expect(publicScript).toContain("bootstrapReady");
  });
});
