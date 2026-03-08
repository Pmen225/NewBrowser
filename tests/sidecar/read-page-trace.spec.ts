import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { recordReadPageTraceArtifacts } from "../../sidecar/src/observability/read-page-trace";
import { createTraceLogger } from "../../sidecar/src/observability/trace-logger";
import type { ReadPageRequest, ReadPageResponse } from "../../src/sidecar/read-page/types";

interface TraceLine {
  event: string;
  result?: Record<string, unknown>;
}

function parseJsonl(raw: string): TraceLine[] {
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TraceLine);
}

describe("recordReadPageTraceArtifacts", () => {
  it("persists YAML + JSON artifacts for successful ReadPage responses", async () => {
    const traceRoot = await mkdtemp(join(tmpdir(), "task8-readpage-trace-"));
    const traceLogger = createTraceLogger({
      rootDir: traceRoot,
      backendUuid: "backend-fixed",
      runId: "run-fixed"
    });

    const request: ReadPageRequest = {
      request_id: "req-read-page",
      action: "ReadPage",
      tab_id: "tab-1",
      params: {}
    };

    const response: ReadPageResponse = {
      request_id: "req-read-page",
      ok: true,
      result: {
        yaml: "- ref_id: f0:101\n  role: button\n",
        tree: [
          {
            ref_id: "f0:101",
            frame_id: "root",
            role: "button",
            name: "Submit",
            bbox: {
              x: 1,
              y: 2,
              w: 3,
              h: 4
            },
            click: {
              x: 2,
              y: 4
            },
            actions: ["click"],
            source: "ax"
          }
        ],
        meta: {
          frame_count: 1,
          interactable_count: 1,
          generated_at: "2026-02-28T00:00:00.000Z"
        }
      }
    };

    await recordReadPageTraceArtifacts(traceLogger, request, response);
    await traceLogger.flush();

    const lines = parseJsonl(await readFile(traceLogger.traceFilePath, "utf8"));
    const yamlLine = lines.find((line) => line.event === "artifact.read_page_yaml");
    const jsonLine = lines.find((line) => line.event === "artifact.read_page_json");
    expect(yamlLine).toBeDefined();
    expect(jsonLine).toBeDefined();

    const yamlPath = yamlLine?.result?.artifact_path;
    const jsonPath = jsonLine?.result?.artifact_path;
    expect(typeof yamlPath).toBe("string");
    expect(typeof jsonPath).toBe("string");

    if (typeof yamlPath === "string") {
      const yamlStats = await stat(yamlPath);
      expect(yamlStats.size).toBeGreaterThan(0);
    }

    if (typeof jsonPath === "string") {
      const jsonStats = await stat(jsonPath);
      expect(jsonStats.size).toBeGreaterThan(0);
    }
  });
});
