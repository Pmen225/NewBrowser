import { readFile, mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createTraceLogger } from "../../sidecar/src/observability/trace-logger";

interface TraceLine {
  timestamp: string;
  backend_uuid: string;
  run_id: string;
  step_index: number;
  request_id?: string;
  action?: string;
  event: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

function parseJsonl(raw: string): TraceLine[] {
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TraceLine);
}

describe("createTraceLogger", () => {
  it("writes newline-delimited trace entries with required correlation fields", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "task8-trace-"));
    let tick = 0;

    const logger = createTraceLogger({
      rootDir,
      backendUuid: "backend-fixed",
      runId: "run-fixed",
      now: () => {
        tick += 1;
        return new Date(Date.UTC(2026, 1, 28, 0, 0, tick)).toISOString();
      }
    });

    await logger.log({
      request_id: "req-1",
      action: "Navigate",
      tab_id: "tab-1",
      event: "rpc.request",
      params: {
        mode: "to",
        url: "https://example.com"
      }
    });

    await logger.log({
      request_id: "req-1",
      action: "Navigate",
      tab_id: "tab-1",
      event: "rpc.response",
      result: {
        url: "https://example.com"
      }
    });

    await logger.flush();

    const lines = parseJsonl(await readFile(logger.traceFilePath, "utf8"));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      backend_uuid: "backend-fixed",
      run_id: "run-fixed",
      step_index: 1,
      request_id: "req-1",
      action: "Navigate",
      event: "rpc.request",
      params: {
        mode: "to",
        url: "https://example.com"
      }
    });
    expect(lines[1]).toMatchObject({
      step_index: 2,
      request_id: "req-1",
      action: "Navigate",
      event: "rpc.response",
      result: {
        url: "https://example.com"
      }
    });
    expect(new Date(lines[0].timestamp).toISOString()).toBe(lines[0].timestamp);
    expect(new Date(lines[1].timestamp).toISOString()).toBe(lines[1].timestamp);
  });

  it("stores artifacts and logs their paths for replay", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "task8-artifacts-"));
    const logger = createTraceLogger({
      rootDir,
      backendUuid: "backend-fixed",
      runId: "run-fixed"
    });

    const pngPath = await logger.writeArtifact({
      request_id: "req-click",
      action: "ComputerBatch",
      tab_id: "tab-1",
      kind: "screenshot",
      extension: "png",
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47])
    });

    await logger.flush();

    const fileStats = await stat(pngPath);
    expect(fileStats.size).toBe(4);

    const lines = parseJsonl(await readFile(logger.traceFilePath, "utf8"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      request_id: "req-click",
      action: "ComputerBatch",
      event: "artifact.screenshot",
      result: {
        artifact_path: pngPath,
        kind: "screenshot"
      }
    });
  });
});
