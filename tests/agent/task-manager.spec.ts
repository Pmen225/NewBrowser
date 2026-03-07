import { describe, expect, it } from "vitest";

import type { AgentRunState } from "../../sidecar/src/agent/types";
import { createTaskManager } from "../../sidecar/src/agent/task-manager";

function makeState(overrides: Partial<AgentRunState> = {}): AgentRunState {
  const now = "2026-03-06T00:00:00.000Z";
  return {
    runId: overrides.runId ?? "run-1",
    taskId: overrides.taskId ?? "task-1",
    role: overrides.role ?? "primary",
    visibility: overrides.visibility ?? "panel",
    parentTaskId: overrides.parentTaskId,
    children: overrides.children ?? [],
    status: overrides.status ?? "running",
    startedAt: overrides.startedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    params: overrides.params ?? {
      prompt: "Do the task",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    },
    steps: overrides.steps ?? [],
    finalAnswer: overrides.finalAnswer,
    draftArtifact: overrides.draftArtifact,
    userLanguage: overrides.userLanguage ?? "en",
    hasImageInput: overrides.hasImageInput ?? false,
    sources: overrides.sources ?? [],
    abortController: overrides.abortController ?? new AbortController(),
    pauseRequested: overrides.pauseRequested ?? false,
    resumeRequested: overrides.resumeRequested ?? false,
    resumeNeedsReassessment: overrides.resumeNeedsReassessment ?? false,
    resumeGate: overrides.resumeGate,
    releaseResumeGate: overrides.releaseResumeGate ?? null,
    errorMessage: overrides.errorMessage,
    activeChildTaskId: overrides.activeChildTaskId,
    childSummary: overrides.childSummary,
    childError: overrides.childError,
    lastValidatedObservation: overrides.lastValidatedObservation
  };
}

describe("task manager", () => {
  it("registers tasks by run id and task id", () => {
    const manager = createTaskManager();
    const primary = makeState();

    manager.register(primary);

    expect(manager.getByRunId(primary.runId)?.taskId).toBe(primary.taskId);
    expect(manager.getByTaskId(primary.taskId)?.runId).toBe(primary.runId);
  });

  it("links one hidden child to a primary task", () => {
    const manager = createTaskManager();
    const primary = makeState();
    const child = makeState({
      runId: "run-child",
      taskId: "task-child",
      role: "subagent",
      visibility: "hidden",
      parentTaskId: primary.taskId
    });

    manager.register(primary);
    const first = manager.linkChild(primary.taskId, child);
    const second = manager.linkChild(
      primary.taskId,
      makeState({
        runId: "run-child-2",
        taskId: "task-child-2",
        role: "subagent",
        visibility: "hidden",
        parentTaskId: primary.taskId
      })
    );

    expect(first.status).toBe("started");
    expect(manager.getByTaskId(primary.taskId)?.activeChildTaskId).toBe(child.taskId);
    expect(manager.getByTaskId(primary.taskId)?.children).toEqual([child.taskId]);
    expect(second.status).toBe("rejected");
    expect(second.error?.code).toBe("SUBAGENT_LIMIT_EXCEEDED");
  });

  it("writes child summary back to the parent and clears the active child", () => {
    const manager = createTaskManager();
    const primary = makeState();
    const child = makeState({
      runId: "run-child",
      taskId: "task-child",
      role: "subagent",
      visibility: "hidden",
      parentTaskId: primary.taskId
    });

    manager.register(primary);
    manager.linkChild(primary.taskId, child);
    manager.completeChild(child.taskId, "Validated child result.");

    const updatedParent = manager.getByTaskId(primary.taskId);
    expect(updatedParent?.activeChildTaskId).toBeUndefined();
    expect(updatedParent?.childSummary).toBe("Validated child result.");
    expect(updatedParent?.childError).toBeUndefined();
  });

  it("writes child errors back to the parent and clears the active child", () => {
    const manager = createTaskManager();
    const primary = makeState();
    const child = makeState({
      runId: "run-child",
      taskId: "task-child",
      role: "subagent",
      visibility: "hidden",
      parentTaskId: primary.taskId
    });

    manager.register(primary);
    manager.linkChild(primary.taskId, child);
    manager.failChild(child.taskId, {
      code: "SUBAGENT_FAILED",
      message: "Child task failed."
    });

    const updatedParent = manager.getByTaskId(primary.taskId);
    expect(updatedParent?.activeChildTaskId).toBeUndefined();
    expect(updatedParent?.childSummary).toBeUndefined();
    expect(updatedParent?.childError).toEqual({
      code: "SUBAGENT_FAILED",
      message: "Child task failed."
    });
  });

  it("returns the child run ids that should stop with a parent task", () => {
    const manager = createTaskManager();
    const primary = makeState();
    const child = makeState({
      runId: "run-child",
      taskId: "task-child",
      role: "subagent",
      visibility: "hidden",
      parentTaskId: primary.taskId
    });

    manager.register(primary);
    manager.linkChild(primary.taskId, child);

    expect(manager.getDescendantRunIds(primary.taskId)).toEqual(["run-child"]);
  });
});
