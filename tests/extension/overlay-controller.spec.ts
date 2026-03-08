import { describe, expect, it } from "vitest";

import {
  closeOverlay,
  normalizeOverlayKind,
  toggleOverlay
} from "../../extension/lib/overlay-controller.js";

describe("overlay controller", () => {
  it("normalizes overlay kinds deterministically", () => {
    expect(normalizeOverlayKind("slash")).toBe("slash");
    expect(normalizeOverlayKind("shortcutEditor")).toBe("shortcutEditor");
    expect(normalizeOverlayKind("wat")).toBe("none");
    expect(normalizeOverlayKind(null)).toBe("none");
  });

  it("toggles the same overlay on/off and switches between overlays", () => {
    expect(toggleOverlay("none", "slash")).toBe("slash");
    expect(toggleOverlay("slash", "slash")).toBe("none");
    expect(toggleOverlay("slash", "model")).toBe("model");
    expect(toggleOverlay("model", "recents")).toBe("recents");
  });

  it("closes overlays explicitly", () => {
    expect(closeOverlay("slash")).toBe("none");
    expect(closeOverlay("none")).toBe("none");
  });
});

