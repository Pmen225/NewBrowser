import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const panelJs = readFileSync(path.join(ROOT, "extension", "panel.js"), "utf8");

describe("panel.js — run reconciliation", () => {
  it("polls AgentGetState so the panel can recover when the terminal SSE event is missed", () => {
    expect(panelJs).toContain('rpc.call("AgentGetState"');
    expect(panelJs).toContain("function scheduleRunStatePoll");
    expect(panelJs).toContain("function pollCurrentRunState");
  });
});
