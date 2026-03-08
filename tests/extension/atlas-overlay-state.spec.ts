import { describe, expect, it } from "vitest";

import {
  atlasStatusLine,
  controlButtonState,
  overlayPhaseForTool,
} from "../../extension/lib/atlas-overlay-state.js";

describe("atlas overlay state", () => {
  it("maps browser tools to distinct Atlas takeover phases", () => {
    expect(overlayPhaseForTool("navigate")).toBe("navigating");
    expect(overlayPhaseForTool("read_page")).toBe("reading");
    expect(overlayPhaseForTool("get_page_text")).toBe("extracting");
    expect(overlayPhaseForTool("computer")).toBe("typing");
  });

  it("renders reading and extracting labels in the takeover status line", () => {
    expect(atlasStatusLine({ phase: "reading", text: "Inspecting the dashboard" }))
      .toBe("Reading · Inspecting the dashboard");
    expect(atlasStatusLine({ phase: "extracting", text: "Collecting visible fields" }))
      .toBe("Extracting · Collecting visible fields");
  });

  it("maps authoritative takeover control states", () => {
    expect(controlButtonState("active")).toMatchObject({
      label: "Take control",
      status: "Logged in · Agent is using your accounts"
    });
    expect(controlButtonState("pausing")).toMatchObject({
      label: "Take control",
      status: "Pausing…"
    });
    expect(controlButtonState("paused")).toMatchObject({
      label: "Resume",
      status: "Paused — you have control"
    });
  });
});
