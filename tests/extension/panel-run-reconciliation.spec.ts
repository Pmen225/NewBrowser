import { describe, expect, it } from "vitest";

import {
  deriveLiveRunState,
  deriveRunControlModel,
  deriveTaskStatusMeta,
  deriveThinkingPresentation,
  deriveTerminalRunSnapshot,
  sanitizeAssistantResponseText
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
      isInterrupted: false,
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
      isInterrupted: false,
      draftArtifact: undefined,
      sources: []
    });
  });

  it("derives an interrupted terminal snapshot without treating it as a hard stop", () => {
    expect(
      deriveTerminalRunSnapshot({
        run_id: "run-2b",
        status: "interrupted",
        error_message: "Request was aborted"
      })
    ).toEqual({
      status: "interrupted",
      rawText: "",
      errorMessage: "Request was aborted",
      isStopped: false,
      isInterrupted: true,
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

  it("strips navigation bookkeeping and leaked tab json from terminal answers", () => {
    expect(
      deriveTerminalRunSnapshot({
        run_id: "run-4",
        status: "completed",
        final_answer: `<answer>The current tab has been updated to:
{"tabId":"BD9227C9376D6A75912CEBB00E3EBA5C","title":"Wikipedia","url":"https://www.wikipedia.org/"}
The query text was "go to wikipedia". I have navigated to Wikipedia. The task is complete.</answer>`
      })
    ).toEqual({
      status: "completed",
      rawText: "I have navigated to Wikipedia.",
      errorMessage: "",
      isStopped: false,
      isInterrupted: false,
      draftArtifact: undefined,
      sources: []
    });
  });

  it("sanitizes assistant response boilerplate for restored chat text", () => {
    expect(
      sanitizeAssistantResponseText(`The current tab has been updated to:
{"tabId":"tab-1","title":"Wikipedia","url":"https://www.wikipedia.org/"}
The query text was "go to wikipedia". I have navigated to Wikipedia. The task is complete.`)
    ).toBe("I have navigated to Wikipedia.");
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
      description: "Working on this page while a background worker checks a subtask.",
      chips: ["1 worker", "Delegating"]
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
      description: "A background worker returned an update.",
      chips: ["1 worker", "Update ready"],
      summary: "Checked the delegated path and returned the result."
    });
  });

  it("derives panel-visible counterpart controls for running and paused runs", () => {
    expect(deriveRunControlModel("active", "running")).toMatchObject({
      actions: [
        { id: "pause", label: "Take control" },
        { id: "stop", label: "Stop" }
      ]
    });

    expect(deriveRunControlModel("paused", "paused")).toMatchObject({
      actions: [
        { id: "resume", label: "Resume" },
        { id: "stop", label: "Stop" }
      ]
    });
  });

  it("switches to a finishing presentation once every tool step is completed", () => {
    expect(
      deriveThinkingPresentation(
        {
          status: "running",
          steps: [
            { callId: "tool-1", toolName: "navigate", label: "Navigate", status: "completed" },
            { callId: "tool-2", toolName: "computer", label: "Interact on page", status: "completed" }
          ]
        },
        "active"
      )
    ).toMatchObject({
      headline: "Finishing",
      summary: "Preparing the final response.",
      meta: ["Done", "2 steps done"],
      actions: [{ id: "stop", label: "Stop", kind: "secondary" }]
    });
  });

  it("keeps the live working controls while a tool step is still running", () => {
    expect(
      deriveThinkingPresentation(
        {
          status: "running",
          steps: [
            { callId: "tool-1", toolName: "navigate", label: "Navigate", status: "completed" },
            { callId: "tool-2", toolName: "computer", label: "Interact on page", status: "running" }
          ]
        },
        "active"
      )
    ).toMatchObject({
      headline: "Working",
      summary: "Interact on page",
      meta: ["Live", "1 step done"],
      actions: [
        { id: "pause", label: "Take control", kind: "primary" },
        { id: "stop", label: "Stop", kind: "secondary" }
      ]
    });
  });
});
