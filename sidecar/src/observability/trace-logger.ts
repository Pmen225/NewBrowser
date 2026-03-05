import { randomUUID } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { JsonObject } from "../../../shared/src/transport";

export interface TraceLoggerOptions {
  rootDir: string;
  backendUuid?: string;
  runId?: string;
  now?: () => string;
  uuid?: () => string;
}

export interface TraceLogInput {
  event: string;
  request_id?: string;
  action?: string;
  tab_id?: string;
  params?: JsonObject;
  result?: JsonObject;
  error?: JsonObject;
}

export interface TraceArtifactInput {
  request_id?: string;
  action?: string;
  tab_id?: string;
  kind: string;
  extension: string;
  data: string | Buffer;
  encoding?: BufferEncoding;
  metadata?: JsonObject;
}

interface TraceLine {
  timestamp: string;
  backend_uuid: string;
  run_id: string;
  step_index: number;
  request_id?: string;
  action?: string;
  tab_id?: string;
  event: string;
  params?: JsonObject;
  result?: JsonObject;
  error?: JsonObject;
}

export interface TraceLogger {
  readonly backendUuid: string;
  readonly runId: string;
  readonly traceFilePath: string;
  log: (input: TraceLogInput) => Promise<void>;
  writeArtifact: (input: TraceArtifactInput) => Promise<string>;
  flush: () => Promise<void>;
}

function sanitizeSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : "artifact";
}

class JsonlTraceLogger implements TraceLogger {
  readonly backendUuid: string;
  readonly runId: string;
  readonly traceFilePath: string;

  private readonly runDir: string;
  private readonly now: () => string;
  private readonly ready: Promise<void>;
  private pending: Promise<void> = Promise.resolve();
  private stepIndex = 0;

  constructor(options: TraceLoggerOptions) {
    const uuid = options.uuid ?? randomUUID;
    this.backendUuid = options.backendUuid ?? uuid();
    this.runId = options.runId ?? uuid();
    this.now = options.now ?? (() => new Date().toISOString());

    const rootDir = resolve(options.rootDir);
    this.runDir = join(rootDir, this.runId);
    this.traceFilePath = join(this.runDir, "trace.jsonl");
    this.ready = mkdir(this.runDir, { recursive: true }).then(() => undefined);
  }

  async log(input: TraceLogInput): Promise<void> {
    const line = this.buildLine(input);
    await this.enqueue(async () => {
      await this.ready;
      await appendFile(this.traceFilePath, `${JSON.stringify(line)}\n`, "utf8");
    });
  }

  async writeArtifact(input: TraceArtifactInput): Promise<string> {
    const step = this.nextStepIndex();
    const name = `${String(step).padStart(6, "0")}-${sanitizeSegment(input.kind)}.${sanitizeSegment(input.extension)}`;
    const artifactPath = join(this.runDir, name);

    const line: TraceLine = {
      timestamp: this.now(),
      backend_uuid: this.backendUuid,
      run_id: this.runId,
      step_index: step,
      request_id: input.request_id,
      action: input.action,
      tab_id: input.tab_id,
      event: `artifact.${sanitizeSegment(input.kind)}`,
      result: {
        artifact_path: artifactPath,
        kind: sanitizeSegment(input.kind),
        ...(input.metadata ?? {})
      }
    };

    await this.enqueue(async () => {
      await this.ready;
      if (Buffer.isBuffer(input.data)) {
        await writeFile(artifactPath, input.data);
      } else {
        await writeFile(artifactPath, input.data, {
          encoding: input.encoding ?? "utf8"
        });
      }
      await appendFile(this.traceFilePath, `${JSON.stringify(line)}\n`, "utf8");
    });

    return artifactPath;
  }

  async flush(): Promise<void> {
    await this.ready;
    await this.pending;
  }

  private buildLine(input: TraceLogInput): TraceLine {
    return {
      timestamp: this.now(),
      backend_uuid: this.backendUuid,
      run_id: this.runId,
      step_index: this.nextStepIndex(),
      request_id: input.request_id,
      action: input.action,
      tab_id: input.tab_id,
      event: input.event,
      params: input.params,
      result: input.result,
      error: input.error
    };
  }

  private nextStepIndex(): number {
    this.stepIndex += 1;
    return this.stepIndex;
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.pending.then(operation, operation);
    this.pending = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}

export function createTraceLogger(options: TraceLoggerOptions): TraceLogger {
  return new JsonlTraceLogger(options);
}
