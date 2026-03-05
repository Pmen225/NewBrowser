import { parseTodoWriteParams, type JsonObject, type TodoItem } from "../../../shared/src/transport";
import type { ActionDispatcher } from "./dispatcher";

export interface TodoDispatcherOptions {
  initialTodos?: TodoItem[];
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Error & {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  const error = new Error(message) as Error & {
    code: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

export function createTodoDispatcher(options: TodoDispatcherOptions = {}): ActionDispatcher {
  let todos: TodoItem[] = Array.isArray(options.initialTodos) ? [...options.initialTodos] : [];

  return {
    supports(action: string): boolean {
      return action === "todo_write" || action === "TodoWrite";
    },
    async dispatch(action: string, _tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "todo_write" && action !== "TodoWrite") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsed = parseTodoWriteParams(params);
      if (!parsed) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid todo_write params", false);
      }

      todos = parsed.todos.map((todo) => ({
        content: todo.content,
        status: todo.status,
        active_form: todo.active_form
      }));

      return {
        updated: todos.length,
        todos
      };
    }
  };
}
