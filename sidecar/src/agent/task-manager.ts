import { type AgentTaskError, type CreateSubagentResult } from "../../../shared/src/transport";
import type { AgentRunState } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function isActiveStatus(status: AgentRunState["status"]): boolean {
  return status === "running" || status === "pausing" || status === "paused";
}

function normalizeParentUpdate(parent: AgentRunState): void {
  parent.updatedAt = nowIso();
}

export interface AgentTaskManager {
  register(state: AgentRunState): void;
  remove(taskId: string): void;
  getByRunId(runId: string): AgentRunState | undefined;
  getByTaskId(taskId: string): AgentRunState | undefined;
  linkChild(parentTaskId: string, child: AgentRunState): CreateSubagentResult;
  completeChild(childTaskId: string, summary?: string): AgentRunState | undefined;
  failChild(childTaskId: string, error: AgentTaskError): AgentRunState | undefined;
  cancelChild(childTaskId: string, error: AgentTaskError): AgentRunState | undefined;
  getDescendantRunIds(taskId: string): string[];
}

function unlinkChild(parent: AgentRunState, childTaskId: string): void {
  if (parent.activeChildTaskId === childTaskId) {
    parent.activeChildTaskId = undefined;
  }
}

function finalizeChild(
  tasksById: Map<string, AgentRunState>,
  tasksByRunId: Map<string, AgentRunState>,
  childTaskId: string,
  patch: { summary?: string; error?: AgentTaskError }
): AgentRunState | undefined {
  const child = tasksById.get(childTaskId);
  if (!child?.parentTaskId) {
    return undefined;
  }

  const parent = tasksById.get(child.parentTaskId);
  tasksById.delete(child.taskId);
  tasksByRunId.delete(child.runId);
  if (!parent) {
    return undefined;
  }

  unlinkChild(parent, child.taskId);
  parent.childSummary = patch.summary;
  parent.childError = patch.error;
  normalizeParentUpdate(parent);
  return parent;
}

export function createTaskManager(): AgentTaskManager {
  const tasksById = new Map<string, AgentRunState>();
  const tasksByRunId = new Map<string, AgentRunState>();

  return {
    register(state) {
      tasksById.set(state.taskId, state);
      tasksByRunId.set(state.runId, state);
    },
    remove(taskId) {
      const state = tasksById.get(taskId);
      if (!state) {
        return;
      }

      tasksById.delete(taskId);
      tasksByRunId.delete(state.runId);
    },
    getByRunId(runId) {
      return tasksByRunId.get(runId);
    },
    getByTaskId(taskId) {
      return tasksById.get(taskId);
    },
    linkChild(parentTaskId, child) {
      const parent = tasksById.get(parentTaskId);
      if (!parent || parent.role !== "primary") {
        return {
          task_id: child.taskId,
          status: "rejected",
          visibility: "hidden",
          error: {
            code: "SUBAGENT_PARENT_INVALID",
            message: "Subagents can only be created from a primary task."
          }
        };
      }

      if (parent.activeChildTaskId) {
        const activeChild = tasksById.get(parent.activeChildTaskId);
        if (activeChild && isActiveStatus(activeChild.status)) {
          return {
            task_id: child.taskId,
            status: "rejected",
            visibility: "hidden",
            error: {
              code: "SUBAGENT_LIMIT_EXCEEDED",
              message: "Only one live subagent is allowed per primary task."
            }
          };
        }
      }

      child.parentTaskId = parent.taskId;
      child.role = "subagent";
      child.visibility = "hidden";
      tasksById.set(child.taskId, child);
      tasksByRunId.set(child.runId, child);
      if (!parent.children.includes(child.taskId)) {
        parent.children.push(child.taskId);
      }
      parent.activeChildTaskId = child.taskId;
      parent.childSummary = undefined;
      parent.childError = undefined;
      normalizeParentUpdate(parent);

      return {
        task_id: child.taskId,
        status: "started",
        visibility: "hidden"
      };
    },
    completeChild(childTaskId, summary) {
      return finalizeChild(tasksById, tasksByRunId, childTaskId, { summary });
    },
    failChild(childTaskId, error) {
      return finalizeChild(tasksById, tasksByRunId, childTaskId, { error });
    },
    cancelChild(childTaskId, error) {
      return finalizeChild(tasksById, tasksByRunId, childTaskId, { error });
    },
    getDescendantRunIds(taskId) {
      const task = tasksById.get(taskId);
      if (!task) {
        return [];
      }

      return task.children
        .map((childTaskId) => tasksById.get(childTaskId)?.runId)
        .filter((value): value is string => typeof value === "string");
    }
  };
}
