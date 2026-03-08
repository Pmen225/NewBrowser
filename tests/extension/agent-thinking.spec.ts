import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("agent thinking state", () => {
  it("renders the current gamma thinking states and action-row UI", () => {
    const css = readFileSync(path.join(ROOT, "extension", "styles.css"), "utf8");
    const script = readFileSync(path.join(ROOT, "extension", "panel.js"), "utf8");

    expect(css).toContain(".thinking-row");
    expect(css).toContain(".action-log");
    expect(css).toContain(".thinking-task-card");
    expect(css).toContain(".thinking-task-chip");
    expect(css).toContain(".gamma-thinking");
    expect(css).toContain(".gamma-scanning");
    expect(css).toContain(".gamma-streaming");
    expect(css).toContain(".gamma-error");
    expect(css).toContain(".gamma-done");

    expect(script).toContain("function setAiAvatar");
    expect(script).toContain("function appendActionItem");
    expect(script).toContain("function syncOverlayTaskStatus");
    expect(script).toContain("function deriveTaskStatusMeta");
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-thinking")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-scanning")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-streaming")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-error")');
    expect(script).toContain('setAiAvatar(currentAiEl, "gamma-done")');
  });
});
