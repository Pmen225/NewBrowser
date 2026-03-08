import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readText(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("project commands and docs contract", () => {
  it("ships foldered docs and canonical root commands", () => {
    const requiredPaths = [
      "scripts/dev-all.mjs",
      "docs/architecture/infrastructure-map.md",
      "docs/runbooks/local-development.md",
      "docs/ui/frontend/design-rules.md"
    ];

    for (const relativePath of requiredPaths) {
      expect(existsSync(path.join(ROOT, relativePath)), relativePath).toBe(true);
    }

    const rootPackage = JSON.parse(readText("package.json"));

    expect(rootPackage.scripts.dev).toBe("node ./scripts/dev-all.mjs");
    expect(rootPackage.scripts["test:all"]).toBe("npm run test");

    const devScript = readText("scripts/dev-all.mjs");
    expect(devScript).toContain("start");
    expect(devScript).toContain("start");
    expect(devScript).toContain("SIGINT");
    expect(devScript).toContain("SIGTERM");

    const architectureDoc = readText("docs/architecture.md");
    expect(architectureDoc).toContain("## Audience");
    expect(architectureDoc).toContain("Codex 5.3");
    expect(architectureDoc).toContain("## Fast Path");
    expect(architectureDoc).toContain("docs/architecture/infrastructure-map.md");

    const infrastructureDoc = readText("docs/architecture/infrastructure-map.md");
    expect(infrastructureDoc).toContain("## Audience");
    expect(infrastructureDoc).toContain("Codex 5.3");
    expect(infrastructureDoc).toContain("## Hard Constraints");
    expect(infrastructureDoc).toContain("extension/");

    const runbook = readText("docs/runbooks/local-development.md");
    expect(runbook).toContain("## Audience");
    expect(runbook).toContain("Codex 5.3");
    expect(runbook).toContain("## Fast Path");
    expect(runbook).toContain("## Required Preconditions");
    expect(runbook).toContain("## Hard Constraints");
    expect(runbook).toContain("npm run dev");
    expect(runbook).toContain("npm run test:all");

    const troubleshootingDoc = readText("docs/troubleshooting.md");
    expect(troubleshootingDoc).toContain("## Audience");
    expect(troubleshootingDoc).toContain("Codex 5.3");
    expect(troubleshootingDoc).toContain("## Canonical Recovery Commands");
    expect(troubleshootingDoc).toContain("## Failures");
    expect(troubleshootingDoc).toContain("npm run dev");
    expect(troubleshootingDoc).toContain("npm run test:all");

    const uiRulesDoc = readText("docs/ui/frontend/design-rules.md");
    expect(uiRulesDoc).toContain("## Audience");
    expect(uiRulesDoc).toContain("Codex 5.3");
    expect(uiRulesDoc).toContain("## Hard Constraints");
    expect(uiRulesDoc).toContain("## Do Not Change Without Intent");
    expect(uiRulesDoc).toContain("## Premium Feel Rules");
    expect(uiRulesDoc).toContain("premium signifiers");
    expect(uiRulesDoc).toContain("restraint");
    expect(uiRulesDoc).toContain("coherence");
    expect(uiRulesDoc).toContain("no jank");
    expect(uiRulesDoc).toContain("loading, empty, error, and offline states");
    expect(uiRulesDoc).toContain("positioning and control location");
    expect(uiRulesDoc).toContain("buttons, menus, icons, and inputs");
    expect(uiRulesDoc).toContain("the next action is obvious at a glance");
    expect(uiRulesDoc).toContain("system-ui");
    expect(uiRulesDoc).toContain("prefers-color-scheme");
  });
});
