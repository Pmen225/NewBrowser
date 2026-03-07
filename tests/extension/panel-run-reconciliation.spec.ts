import { describe, expect, it } from "vitest";

import { deriveTerminalRunSnapshot } from "../../extension/panel.js";

describe("panel run reconciliation", () => {
  it("derives a completed terminal snapshot from AgentGetState payloads", () => {
    expect(
      deriveTerminalRunSnapshot({
        run_id: "run-1",
        status: "completed",
        final_answer: "<answer>The file was uploaded.</answer>",
        sources: [{ id: "[web:1]", origin: "web", action: "get_page_text" }]
      })
    ).toEqual({
      status: "completed",
      rawText: "The file was uploaded.",
      errorMessage: "",
      isStopped: false,
      draftArtifact: undefined,
      sources: [{ id: "[web:1]", origin: "web", action: "get_page_text" }]
    });
  });

  it("derives a failed terminal snapshot when the backend returns an error", () => {
    expect(
      deriveTerminalRunSnapshot({
        run_id: "run-2",
        status: "failed",
        error_message: "MODEL_EMPTY_TURN"
      })
    ).toEqual({
      status: "failed",
      rawText: "",
      errorMessage: "MODEL_EMPTY_TURN",
      isStopped: false,
      draftArtifact: undefined,
      sources: []
    });
  });

  it("ignores non-terminal snapshots", () => {
    expect(
      deriveTerminalRunSnapshot({
        run_id: "run-3",
        status: "running",
        final_answer: "Still thinking"
      })
    ).toBeNull();
  });
});
