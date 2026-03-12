import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ISSUE_TEMPLATE_DIR = path.join(ROOT, ".github", "ISSUE_TEMPLATE");

describe("QA automation entrypoints", () => {
  it("exposes the standardized QA npm scripts", async () => {
    const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

    expect(packageJson.scripts["qa:smoke"]).toBe("bash scripts/run-qa-smoke.sh");
    expect(packageJson.scripts["qa:regression"]).toBe("npm run test:funnels");
    expect(packageJson.scripts["qa:artifacts"]).toBe("node scripts/collect-qa-artifacts.mjs");
    expect(packageJson.scripts["qa:trace"]).toBe("node scripts/live-cdp-panel-check.mjs");
  });

  it("makes the default browser launcher start a working assistant stack", () => {
    const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

    expect(packageJson.scripts["launch:browser"]).toBe("npm start");
    expect(packageJson.scripts["launch:browser:only"]).toBe("node scripts/launch-browser-only.mjs");
  });

  it("collects output and sidecar traces into a manifest", async () => {
    const sandbox = path.join(tmpdir(), `qa-artifacts-${Date.now()}`);
    const reportDir = path.join(sandbox, "output", "playwright", "smoke-run");
    const traceDir = path.join(sandbox, ".sidecar-traces", "run-123");
    const manifestPath = path.join(sandbox, "output", "qa-artifacts", "manifest.json");

    mkdirSync(reportDir, { recursive: true });
    mkdirSync(traceDir, { recursive: true });
    writeFileSync(path.join(reportDir, "report.json"), JSON.stringify({ ok: true }, null, 2));
    writeFileSync(path.join(reportDir, "panel-final.png"), "png");
    writeFileSync(path.join(traceDir, "trace.jsonl"), "{\"event\":\"ok\"}\n");

    const { collectQaArtifacts } = await import("../../scripts/collect-qa-artifacts.mjs");
    const manifest = collectQaArtifacts({
      root: sandbox,
      outputFile: manifestPath
    });

    expect(manifest.outputFile).toBe(path.relative(sandbox, manifestPath));
    expect(manifest.roots).toEqual([
      expect.objectContaining({
        key: "output",
        exists: true,
        fileCount: 3
      }),
      expect.objectContaining({
        key: "sidecar-traces",
        exists: true,
        fileCount: 1
      })
    ]);
    expect(manifest.files).toEqual([
      "output/playwright/smoke-run/panel-final.png",
      "output/playwright/smoke-run/report.json",
      "output/qa-artifacts/manifest.json",
      ".sidecar-traces/run-123/trace.jsonl"
    ]);
    expect(existsSync(manifestPath)).toBe(true);
  });

  it("writes a valid empty manifest when no artifact roots exist", async () => {
    const sandbox = path.join(tmpdir(), `qa-artifacts-empty-${Date.now()}`);
    const manifestPath = path.join(sandbox, "output", "qa-artifacts", "manifest.json");

    const { collectQaArtifacts } = await import("../../scripts/collect-qa-artifacts.mjs");
    const manifest = collectQaArtifacts({
      root: sandbox,
      outputFile: manifestPath
    });

    expect(manifest.roots).toEqual([
      expect.objectContaining({ key: "output", exists: false, fileCount: 0 }),
      expect.objectContaining({ key: "sidecar-traces", exists: false, fileCount: 0 })
    ]);
    expect(manifest.files).toEqual(["output/qa-artifacts/manifest.json"]);
    expect(existsSync(manifestPath)).toBe(true);
  });

  it("ships QA issue templates for each standardized failure label", () => {
    const expectedTemplates = [
      { file: "runtime-failure.md", label: "runtime-failure" },
      { file: "perception-failure.md", label: "perception-failure" },
      { file: "validation-failure.md", label: "validation-failure" },
      { file: "transport-sync-failure.md", label: "transport-sync-failure" },
      { file: "recovery-failure.md", label: "recovery-failure" },
      { file: "premature-completion.md", label: "premature-completion" }
    ];

    for (const template of expectedTemplates) {
      const templatePath = path.join(ISSUE_TEMPLATE_DIR, template.file);
      expect(existsSync(templatePath), `Missing ${template.file}`).toBe(true);

      const body = readFileSync(templatePath, "utf8");
      expect(body).toContain(`labels: [\"${template.label}\"]`);
      expect(body).toContain("## Smoke Rerun Verification");
      expect(body).toContain("`npm run qa:smoke`");
      expect(body).toContain("## Artifact Paths");
    }
  });

  it("documents the browser-agent automation entrypoints in one markdown file", () => {
    const docPath = path.join(ROOT, "docs", "testing", "browser-agent-automation.md");

    expect(existsSync(docPath)).toBe(true);

    const body = readFileSync(docPath, "utf8");
    expect(body).toContain("`npm run qa:smoke`");
    expect(body).toContain("`npm run qa:regression`");
    expect(body).toContain("`npm run qa:artifacts`");
    expect(body).toContain("`npm run qa:trace`");
  });

  it("keeps the smoke runtime-readiness guard wired into qa:smoke", () => {
    const smokeScriptPath = path.join(ROOT, "scripts", "run-qa-smoke.sh");
    const runtimeGuardPath = path.join(ROOT, "scripts", "lib", "qa-smoke-runtime.cjs");
    const bootstrapGuardPath = path.join(ROOT, "scripts", "lib", "playwright-bootstrap-check.cjs");

    expect(existsSync(runtimeGuardPath), "Missing qa smoke runtime guard module").toBe(true);
    expect(existsSync(bootstrapGuardPath), "Missing playwright bootstrap guard module").toBe(true);

    const smokeBody = readFileSync(smokeScriptPath, "utf8");
    expect(smokeBody).toContain("waitForSidecarRuntimeReadiness");
    expect(smokeBody).toContain("assertPlaywrightBootstrapReady");
    expect(smokeBody).toContain("Panel shows sidecar offline signal during smoke pass");
  });

  it("keeps funnel bootstrap guard wired into vitest funnel config", () => {
    const funnelsConfigPath = path.join(ROOT, "vitest.funnels.config.ts");
    const globalSetupPath = path.join(ROOT, "tests", "playwright", "helpers", "funnels-bootstrap-global-setup.ts");
    const panelStopSpecPath = path.join(ROOT, "tests", "playwright", "funnels", "panel-stop-state.spec.ts");
    const panelImageSpecPath = path.join(ROOT, "tests", "playwright", "funnels", "panel-image-attachments.spec.ts");
    const cometFunnelsSpecPath = path.join(ROOT, "tests", "playwright", "funnels", "comet-transcript-funnels.spec.ts");
    const setupBody = readFileSync(globalSetupPath, "utf8");
    const configBody = readFileSync(funnelsConfigPath, "utf8");
    const panelStopBody = readFileSync(panelStopSpecPath, "utf8");
    const panelImageBody = readFileSync(panelImageSpecPath, "utf8");
    const cometFunnelsBody = readFileSync(cometFunnelsSpecPath, "utf8");

    expect(existsSync(globalSetupPath), "Missing funnel bootstrap global setup").toBe(true);
    expect(setupBody).toContain("assertPlaywrightBootstrapReady");
    expect(setupBody).toContain("assertLoopbackBindReady");
    expect(configBody).toContain("funnels-bootstrap-global-setup.ts");
    expect(panelStopBody).toContain("listenWithLoopbackGuard");
    expect(panelStopBody).not.toContain('listen(0, "127.0.0.1"');
    expect(panelImageBody).toContain("listenWithLoopbackGuard");
    expect(panelImageBody).not.toContain('listen(0, "127.0.0.1"');
    expect(cometFunnelsBody).toContain("listenWithLoopbackGuard");
    expect(cometFunnelsBody).not.toContain('listen(0, "127.0.0.1"');
  });
});
