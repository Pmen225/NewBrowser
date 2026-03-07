import { describe, expect, it } from "vitest";

import { createTodoDispatcher } from "../../sidecar/src/rpc/todo-dispatcher";

describe("todo dispatcher", () => {
  it("supports canonical and alias action names", () => {
    const dispatcher = createTodoDispatcher();
    expect(dispatcher.supports?.("todo_write")).toBe(true);
    expect(dispatcher.supports?.("TodoWrite")).toBe(true);
  });

  it("updates todo state via todo_write action", async () => {
    const dispatcher = createTodoDispatcher();
    const result = await dispatcher.dispatch(
      "todo_write",
      "__system__",
      {
        todos: [
          {
            content: "Open the page",
            status: "in_progress",
            active_form: "Opening the page..."
          },
          {
            content: "Extract data",
            status: "pending"
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      updated: 2,
      todos: [
        {
          content: "Open the page",
          status: "in_progress",
          active_form: "Opening the page..."
        },
        {
          content: "Extract data",
          status: "pending",
          active_form: undefined
        }
      ]
    });
  });

  it("accepts TodoWrite alias action", async () => {
    const dispatcher = createTodoDispatcher();
    const result = await dispatcher.dispatch(
      "TodoWrite",
      "__system__",
      {
        todos: [
          {
            content: "Alias action",
            status: "pending"
          }
        ]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      updated: 1,
      todos: [
        {
          content: "Alias action",
          status: "pending",
          active_form: undefined
        }
      ]
    });
  });
});
