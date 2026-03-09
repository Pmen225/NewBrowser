import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  defaultMind2WebFixturePath,
  loadMind2WebTaskSet,
  materializeLocalMind2WebSubset,
  materializeOnlineMind2WebSubset
} from "../../scripts/lib/mind2web-fixtures.js";

const cleanup = [];

afterEach(() => {
  while (cleanup.length > 0) {
    const dir = cleanup.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("mind2web fixture preparation", () => {
  it("materializes the committed local subset to the deterministic data path", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mind2web-local-"));
    cleanup.push(root);
    const fixtureDir = path.join(root, "scripts", "fixtures", "mind2web");
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      path.join(fixtureDir, "minimal-subset.json"),
      readFileSync(path.join(process.cwd(), "scripts", "fixtures", "mind2web", "minimal-subset.json"), "utf8")
    );

    const outputPath = materializeLocalMind2WebSubset(root);

    expect(outputPath).toBe(path.join(root, "data", "benchmarks", "mind2web", "local", "minimal-subset.json"));
    expect(existsSync(outputPath)).toBe(true);
  });

  it("loads the repo fixture subset and keeps task metadata intact", () => {
    const fixturePath = path.join(process.cwd(), "scripts", "fixtures", "mind2web", "minimal-subset.json");
    const taskSet = loadMind2WebTaskSet(fixturePath);

    expect(taskSet.benchmark).toBe("mind2web-local-subset");
    expect(taskSet.tasks).toHaveLength(3);
    expect(taskSet.tasks[0].taskId).toBe("mind2web-local-checkboxes-1");
  });

  it("writes an online subset when an authenticated source file is provided", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "mind2web-online-"));
    cleanup.push(root);
    const sourcePath = path.join(root, "online.json");
    const outputPath = path.join(root, "data", "benchmarks", "mind2web", "online", "online-subset.json");
    const payload = [
      { task_id: "a", website: "x", confirmed_task: "task a" },
      { task_id: "b", website: "y", confirmed_task: "task b" }
    ];
    await import("node:fs/promises").then(({ writeFile }) => writeFile(sourcePath, JSON.stringify(payload), "utf8"));

    const writtenPath = await materializeOnlineMind2WebSubset({
      root,
      sourcePath,
      outputPath
    });

    expect(writtenPath).toBe(outputPath);
    expect(existsSync(defaultMind2WebFixturePath(root))).toBe(false);
    const taskSet = loadMind2WebTaskSet(writtenPath);
    expect(taskSet.tasks).toHaveLength(2);
  });

  it("fails with a clear gated-dataset error when no authenticated online source is provided", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "mind2web-online-gated-"));
    cleanup.push(root);

    await expect(
      materializeOnlineMind2WebSubset({
        root,
        sourcePath: "",
        token: ""
      })
    ).rejects.toThrow(
      "Online-Mind2Web is gated. Set ONLINE_MIND2WEB_JSON or HF_TOKEN/HUGGING_FACE_HUB_TOKEN to materialize a local subset."
    );
  });
});
