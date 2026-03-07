import { describe, expect, it } from "vitest";

import {
  deleteManualMemory,
  hideDerivedMemory,
  normalizeMemoryStore,
  selectRelevantMemoryEntries,
  upsertManualMemory
} from "../../extension/lib/memory.js";

describe("memory store", () => {
  it("normalizes to safe defaults", () => {
    expect(normalizeMemoryStore(null)).toEqual({
      manualItems: [],
      hiddenSourceKeys: []
    });
  });

  it("upserts, edits, and deletes manual memories", () => {
    const initial = normalizeMemoryStore(null);
    const created = upsertManualMemory(initial, {
      text: "Prince works IT support in Halo and Microsoft 365 admin."
    }, { now: "2026-03-07T00:00:00.000Z", idFactory: () => "mem-1" });
    expect(created.manualItems).toEqual([
      expect.objectContaining({
        id: "mem-1",
        text: "Prince works IT support in Halo and Microsoft 365 admin."
      })
    ]);

    const updated = upsertManualMemory(created, {
      id: "mem-1",
      text: "Prince works IT support in Halo, Exchange Hybrid, and Intune."
    }, { now: "2026-03-07T01:00:00.000Z" });
    expect(updated.manualItems[0]).toEqual(expect.objectContaining({
      id: "mem-1",
      text: "Prince works IT support in Halo, Exchange Hybrid, and Intune."
    }));

    expect(deleteManualMemory(updated, "mem-1").manualItems).toEqual([]);
  });

  it("hides derived memories without touching manual entries", () => {
    const store = upsertManualMemory(normalizeMemoryStore(null), {
      text: "Always check the knowledge base before changing permissions."
    }, { now: "2026-03-07T00:00:00.000Z", idFactory: () => "manual-1" });

    const hidden = hideDerivedMemory(store, "bookmark:123");
    expect(hidden.hiddenSourceKeys).toEqual(["bookmark:123"]);
    expect(hidden.manualItems).toHaveLength(1);
  });

  it("prefers prompt-matching memories and falls back to recent manual ones", () => {
    const entries = [
      {
        key: "manual:1",
        source: "manual",
        text: "Prince works in Halo Service Desk and Intune.",
        updatedAt: "2026-03-07T10:00:00.000Z"
      },
      {
        key: "bookmark:1",
        source: "bookmark",
        text: "Microsoft 365 admin center",
        title: "Microsoft 365 admin center",
        updatedAt: "2026-03-06T10:00:00.000Z"
      },
      {
        key: "history:1",
        source: "history",
        text: "Halo knowledge base permissions article",
        title: "KB permissions",
        updatedAt: "2026-03-06T12:00:00.000Z"
      }
    ];

    expect(
      selectRelevantMemoryEntries("Check Microsoft 365 permissions in the Halo knowledge base", entries, 3).map((entry) => entry.key)
    ).toEqual(["history:1", "bookmark:1", "manual:1"]);

    expect(
      selectRelevantMemoryEntries("hello there", entries, 2).map((entry) => entry.key)
    ).toEqual(["manual:1"]);
  });

  it("prioritizes manual and settings memories for explicit recall prompts", () => {
    const entries = [
      {
        key: "history:1",
        source: "history",
        text: "Example Domain https://example.com",
        updatedAt: "2026-03-07T10:00:00.000Z"
      },
      {
        key: "settings:1",
        source: "settings",
        text: "Browser admin pages are enabled.",
        updatedAt: "2026-03-07T09:00:00.000Z"
      },
      {
        key: "manual:1",
        source: "manual",
        text: "Prince wants the assistant to investigate before emailing users.",
        updatedAt: "2026-03-07T11:00:00.000Z"
      }
    ];

    expect(
      selectRelevantMemoryEntries("What do you remember about how Prince wants you to work?", entries, 3).map((entry) => entry.key)
    ).toEqual(["manual:1", "settings:1"]);
  });
});
