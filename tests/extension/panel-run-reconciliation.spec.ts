import { describe, expect, it } from "vitest";

import {
  deriveLiveRunState,
  deriveTaskStatusMeta,
  deriveTerminalRunSnapshot
} from "../../extension/panel.js";

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

  it("merges task metadata from live AgentGetState payloads", () => {
    expect(
      deriveLiveRunState(
        {
          steps: [{ callId: "tool-1", toolName: "navigate", label: "Navigate", status: "completed" }]
        },
        {
          status: "running",
          task: {
            task_id: "task-1",
            role: "primary",
            visibility: "panel",
            children: ["task-child-1"],
            active_child_task_id: "task-child-1",
            child_summary: "<answer>Handled the delegated step.</answer>"
          }
        }
      )
    ).toMatchObject({
      status: "running",
      steps: [{ callId: "tool-1", toolName: "navigate", label: "Navigate", status: "completed" }],
      task: {
        taskId: "task-1",
        role: "primary",
        visibility: "panel",
        children: ["task-child-1"],
        activeChildTaskId: "task-child-1",
        childSummary: "Handled the delegated step."
      }
    });
  });

  it("derives subagent-friendly task status copy", () => {
    expect(
      deriveTaskStatusMeta({
        taskId: "task-1",
        role: "primary",
        visibility: "panel",
        children: ["task-child-1"],
        activeChildTaskId: "task-child-1",
        childSummary: "",
        childError: null
      })
    ).toMatchObject({
      description: "Delegating a hidden worker while keeping this page live.",
      chips: ["Primary", "Panel", "1 hidden worker", "Delegating"]
    });

    expect(
      deriveTaskStatusMeta({
        taskId: "task-1",
        role: "primary",
        visibility: "panel",
        children: ["task-child-1"],
        activeChildTaskId: "",
        childSummary: "<answer>Checked the delegated path and returned the result.</answer>",
        childError: null
      })
    ).toMatchObject({
      summary: "Checked the delegated path and returned the result."
    });
  });
});
