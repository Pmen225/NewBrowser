import type { AgentMemoryRecord, AgentMemoryStore } from "./types";

export interface MemoryStoreOptions {
  ttlMs?: number;
  maxRecords?: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createMemoryStore(options: MemoryStoreOptions = {}): AgentMemoryStore {
  const ttlMs =
    typeof options.ttlMs === "number" && Number.isFinite(options.ttlMs) && options.ttlMs > 0
      ? Math.floor(options.ttlMs)
      : 30 * 60_000;
  const maxRecords =
    typeof options.maxRecords === "number" && Number.isFinite(options.maxRecords) && options.maxRecords > 0
      ? Math.floor(options.maxRecords)
      : 200;

  const records = new Map<string, AgentMemoryRecord>();

  const prune = (): void => {
    const cutoff = Date.now() - ttlMs;
    for (const [runId, record] of records.entries()) {
      if (Date.parse(record.updatedAt) < cutoff) {
        records.delete(runId);
      }
    }

    if (records.size <= maxRecords) {
      return;
    }

    const byUpdated = [...records.values()].sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
    for (let index = 0; index < byUpdated.length - maxRecords; index += 1) {
      records.delete(byUpdated[index].runId);
    }
  };

  return {
    read(runId: string): AgentMemoryRecord | undefined {
      prune();
      return records.get(runId);
    },
    upsert(runId: string, patch: Record<string, unknown>): AgentMemoryRecord {
      prune();
      const existing = records.get(runId);
      const now = nowIso();
      const next: AgentMemoryRecord = {
        runId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        data: {
          ...(existing?.data ?? {}),
          ...patch
        }
      };
      records.set(runId, next);
      return next;
    },
    remove(runId: string): void {
      records.delete(runId);
    },
    prune
  };
}
