import { describe, expect, it } from "vitest";

import {
  deleteShortcut,
  listMatchingShortcuts,
  normalizeShortcuts,
  upsertShortcut
} from "../../extension/lib/shortcuts.js";

describe("extension shortcuts", () => {
  it("normalizes, sorts, and filters slash shortcuts", () => {
    const shortcuts = normalizeShortcuts([
      {
        id: "2",
        trigger: "notes",
        label: "Notes",
        instructions: "Capture notes",
        updatedAt: "2026-03-01T10:00:00.000Z"
      },
      {
        id: "1",
        trigger: "/research",
        label: "Research",
        instructions: "Run deep research",
        pinned: true,
        updatedAt: "2026-03-01T09:00:00.000Z"
      }
    ]);

    expect(shortcuts).toEqual([
      expect.objectContaining({
        id: "1",
        trigger: "/research",
        pinned: true
      }),
      expect.objectContaining({
        id: "2",
        trigger: "/notes",
        pinned: false
      })
    ]);

    expect(listMatchingShortcuts(shortcuts, "re")).toEqual([
      expect.objectContaining({ trigger: "/research" })
    ]);
  });

  it("upserts and deletes shortcuts deterministically", () => {
    const seeded = normalizeShortcuts([]);
    const now = "2026-03-02T12:00:00.000Z";

    const inserted = upsertShortcut(seeded, {
      trigger: "/brief",
      label: "Brief",
      instructions: "Write a concise brief",
      pinned: false
    }, {
      now,
      idFactory: () => "short-1"
    });

    expect(inserted).toEqual([
      expect.objectContaining({
        id: "short-1",
        trigger: "/brief",
        label: "Brief",
        instructions: "Write a concise brief"
      })
    ]);

    const updated = upsertShortcut(inserted, {
      id: "short-1",
      trigger: "/brief",
      label: "Briefing",
      instructions: "Write an expanded brief",
      pinned: true
    }, {
      now: "2026-03-02T12:30:00.000Z"
    });

    expect(updated).toEqual([
      expect.objectContaining({
        id: "short-1",
        label: "Briefing",
        pinned: true
      })
    ]);

    expect(deleteShortcut(updated, "short-1")).toEqual([]);
  });
});
