import { describe, expect, it, vi } from "vitest";

import { createOrchestrator } from "../../sidecar/src/agent/orchestrator";
import { loadPromptSpecs } from "../../sidecar/src/agent/prompt-loader";
import type { ProviderRegistry } from "../../sidecar/src/llm/types";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject
  };
}

describe("agent orchestrator", () => {
  it("fails immediately when the provider API key is missing", async () => {
    const runTurn = vi.fn();
    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open the current page and summarise it",
      provider: "openai"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("failed");
      expect(state.error_message).toBe("Provider API key required for AgentRun.");
    });

    expect(runTurn).not.toHaveBeenCalled();
  });

  it("uses the provider tool loop, executes tool calls, and returns a validated final answer", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will navigate now.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://example.com"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.",
        toolCalls: []
      });
    const performAction = vi.fn(async () => ({
      url: "https://example.com"
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open example.com",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    expect(performAction).toHaveBeenCalledWith(
      "navigate",
      "tab-1",
      {
        mode: "to",
        url: "https://example.com"
      },
      expect.any(AbortSignal)
    );

    const secondTurn = runTurn.mock.calls[1]?.[1];
    expect(secondTurn).toMatchObject({
      apiKey: "sk-test"
    });
    expect(Array.isArray(secondTurn?.messages)).toBe(true);
    expect(
      secondTurn.messages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "navigate" &&
          typeof message.content === "string" &&
          message.content.includes("https://example.com")
      )
    ).toBe(true);
  });

  it("replays prior chat turns before the current user prompt", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I remember the earlier request.",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "What did I ask you to do?",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test",
      history_messages: [
        { role: "user", text: "Can you go to Google?" },
        { role: "assistant", text: "I navigated to Google." }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I remember the earlier request.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(runTurn.mock.calls[0]?.[1]?.messages).toEqual([
      {
        role: "system",
        content: expect.any(String)
      },
      {
        role: "user",
        content: "Can you go to Google?"
      },
      {
        role: "assistant",
        content: "I navigated to Google."
      },
      {
        role: "user",
        content: "What did I ask you to do?"
      }
    ]);
  });

  it("adds a terse plain-text observation instruction for direct observation prompts", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Image: Google homepage.[screenshot:1]",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "What do you see?",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test",
      images: ["data:image/png;base64,AAAA"]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(runTurn.mock.calls[0]?.[1]?.messages).toEqual([
      {
        role: "system",
        content: expect.any(String)
      },
      {
        role: "system",
        content: expect.stringContaining("plain text only")
      },
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see?" },
          { type: "image", media_type: "image/png", data: "AAAA" }
        ]
      }
    ]);
  });

  it("fails when the provider returns neither text nor tool calls", async () => {
    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn: vi.fn(async () => ({
          toolCalls: []
        }))
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Do the task",
      provider: "anthropic",
      model: "claude-3-5-sonnet-latest",
      api_key: "sk-ant"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("failed");
      expect(state.error_message).toBe("Provider returned no assistant text or tool calls.");
    });
  });

  it("retries once when the provider returns an empty turn after a tool result", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will inspect the site first.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://the-internet.herokuapp.com/"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "Here are five useful sections for browser-agent testing.",
        toolCalls: []
      });
    const performAction = vi.fn(async () => ({
      url: "https://the-internet.herokuapp.com/"
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Give me a crash course on the site.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Here are five useful sections for browser-agent testing.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(3);
  });

  it("retries empty post-tool turns with the validated observation and escalates tool mode before failing", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will inspect the page.",
        provider_parts: [
          {
            functionCall: {
              name: "read_page",
              args: {}
            },
            thoughtSignature: "sig-1"
          }
        ],
        toolCalls: [
          {
            id: "call-1",
            name: "read_page",
            arguments: {}
          }
        ]
      })
      .mockResolvedValueOnce({
        toolCalls: [],
        finishReason: "STOP"
      })
      .mockResolvedValueOnce({
        toolCalls: [],
        finishReason: "STOP"
      });
    const performAction = vi.fn(async () => ({
      markdown: "# JavaScript Alerts\nResult text is empty."
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Trigger the JS prompt and tell me the result.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("failed");
      expect(state.error_message).toContain("finishReason: STOP");
      expect(state.task?.last_validated_observation).toContain("JavaScript Alerts");
    });

    expect(runTurn).toHaveBeenCalledTimes(3);
    expect(runTurn.mock.calls[1]?.[1]).toMatchObject({
      functionCallingMode: "VALIDATED"
    });
    expect(runTurn.mock.calls[2]?.[1]).toMatchObject({
      functionCallingMode: "ANY"
    });
    const retryMessages = runTurn.mock.calls[2]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Validated page observation:")
      )
    ).toBe(true);
  });

  it("does not expose tabs_create for ordinary same-tab navigation prompts", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I navigated to Google.",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Can you go to Google?",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const toolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("navigate");
    expect(toolNames).not.toContain("tabs_create");
  });

  it("keeps tabs_create available for explicit new-tab requests", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Opened Google in a new tab.",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open Google in a new tab.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const toolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("tabs_create");
  });

  it("includes task metadata in AgentGetState for primary runs", async () => {
    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn: vi.fn(async () => ({
          assistantText: "Done.",
          toolCalls: []
        }))
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Summarise the page",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.task).toMatchObject({
        run_id: started.run_id,
        role: "primary",
        visibility: "panel",
        children: []
      });
    });
  });

  it("creates a hidden subagent and writes its summary back to the parent task", async () => {
    const parentTurn = createDeferred<{
      assistantText?: string;
      toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
    }>();
    const runTurn = vi
      .fn()
      .mockImplementationOnce(async () => parentTurn.promise)
      .mockResolvedValueOnce({
        assistantText: "Child completed the delegated task.",
        toolCalls: []
      });
    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Handle the main task",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    const runningState = await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.task?.task_id).toBeTruthy();
      return state;
    });

    const childResult = await orchestrator.createSubagent?.({
      prompt: "Do the delegated subtask",
      parent_task_id: runningState.task?.task_id ?? "",
      goal_summary: "Verify the delegated path"
    });

    expect(childResult).toMatchObject({
      status: "started",
      visibility: "hidden"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.task?.child_summary).toBe("<answer>Child completed the delegated task.</answer>");
      expect(state.task?.active_child_task_id).toBeUndefined();
    });

    parentTurn.resolve({
      assistantText: "Parent completed the main task.",
      toolCalls: []
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });
  });

  it("does not emit tool events for hidden subagent runs", async () => {
    const parentTurn = createDeferred<{
      assistantText?: string;
      toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
    }>();
    const runTurn = vi
      .fn()
      .mockImplementationOnce(async () => parentTurn.promise)
      .mockResolvedValueOnce({
        assistantText: "I will navigate now.",
        toolCalls: [
          {
            id: "child-call-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://example.com"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Child done.",
        toolCalls: []
      });
    const onToolEvent = vi.fn();
    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({
        url: "https://example.com"
      })),
      providerRegistry: {
        runTurn
      } as ProviderRegistry,
      onToolEvent
    });

    const started = await orchestrator.run({
      prompt: "Handle the main task",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    const runningState = await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.task?.task_id).toBeTruthy();
      return state;
    });

    await orchestrator.createSubagent?.({
      prompt: "Navigate in the delegated task",
      parent_task_id: runningState.task?.task_id ?? ""
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.task?.child_summary).toBe("<answer>Child done.</answer>");
    });

    expect(onToolEvent).not.toHaveBeenCalled();

    parentTurn.resolve({
      assistantText: "Parent completed the main task.",
      toolCalls: []
    });
  });

  it("suppresses web search tools for local interactive browser tasks on the active tab", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I can handle that on the current site.",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Visit the Checkboxes page, make sure checkbox 1 is checked and checkbox 2 is unchecked, then tell me the final state.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I can handle that on the current site.</answer>");
    });

    const firstTurn = runTurn.mock.calls[0]?.[1];
    expect(firstTurn?.allowBrowserSearch).toBe(false);
    expect(firstTurn?.tools.some((tool: { name?: string }) => tool.name === "search_web")).toBe(false);
  });

  it("keeps web search available for explicit external research prompts", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I will use web search for that.",
      toolCalls: []
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Find the official Python docs for list comprehensions and cite them.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I will use web search for that.</answer>");
    });

    const firstTurn = runTurn.mock.calls[0]?.[1];
    expect(firstTurn?.allowBrowserSearch).toBe(true);
    expect(firstTurn?.tools.some((tool: { name?: string }) => tool.name === "search_web")).toBe(true);
  });

  it("stores an email draft artifact from the local draft_email tool without using browser actions", async () => {
    const promptSpecs = await loadPromptSpecs();
    promptSpecs.toolNames = [...promptSpecs.toolNames, "draft_email"];
    promptSpecs.declaredTools = [
      ...promptSpecs.declaredTools,
      {
        name: "draft_email",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["subject", "body_markdown"],
          properties: {
            subject: { type: "string" },
            body_markdown: { type: "string" }
          }
        }
      }
    ];

    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will prepare the draft.",
        toolCalls: [
          {
            id: "call-draft",
            name: "draft_email",
            arguments: {
              subject: "Accessing David Finch's calendar",
              body_markdown: "- Open Outlook\n- Go to **Calendar**\n- Search for David Finch"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.",
        toolCalls: []
      });
    const performAction = vi.fn(async () => ({
      ok: true
    }));

    const orchestrator = await createOrchestrator({
      promptSpecs,
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Draft a short email reply for this user.",
      provider: "openai",
      model: "gpt-4.1-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.</answer>");
      expect(state.draft_artifact).toMatchObject({
        kind: "email",
        subject: "Accessing David Finch's calendar",
        body_markdown: "- Open Outlook\n- Go to **Calendar**\n- Search for David Finch"
      });
      expect(state.draft_artifact?.body_text).toContain("- Open Outlook");
      expect(state.draft_artifact?.body_text).toContain("- Go to Calendar");
    });

    expect(performAction).not.toHaveBeenCalled();

    const secondTurn = runTurn.mock.calls[1]?.[1];
    expect(
      secondTurn?.messages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "draft_email" &&
          typeof message.content === "string" &&
          message.content.includes("Accessing David Finch's calendar")
      )
    ).toBe(true);
  });

  it("requires structured inspection after navigation before coordinate-based computer clicks", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "Opening the page first.",
        toolCalls: [
          {
            id: "nav-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://the-internet.herokuapp.com/dynamic_controls"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I will click the button from the screenshot.",
        toolCalls: [
          {
            id: "computer-1",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  x: 1050,
                  y: 272
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I will inspect the page structure first.",
        toolCalls: [
          {
            id: "read-1",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.[web:1]",
        toolCalls: []
      });

    const performAction = vi
      .fn()
      .mockResolvedValueOnce({
        url: "https://the-internet.herokuapp.com/dynamic_controls"
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:remove\"\n    role: \"button\"\n    name: \"Remove\"",
        tree: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Go to Dynamic Controls and remove the checkbox",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.[web:1]</answer>");
    });

    expect(performAction).toHaveBeenCalledTimes(2);
    expect(performAction).not.toHaveBeenCalledWith(
      "computer",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    const thirdTurn = runTurn.mock.calls[2]?.[1];
    expect(
      thirdTurn.messages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "computer" &&
          typeof message.content === "string" &&
          message.content.includes("NAVIGATION_INSPECTION_REQUIRED")
      )
    ).toBe(true);
  });

  it("requires validation before accepting a final answer after a state-changing page action", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I'll remove the checkbox first.",
        toolCalls: [
          {
            id: "computer-1",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  ref: "f0:remove"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "The checkbox is gone.[web:1]",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "I'll verify the page state now.",
        toolCalls: [
          {
            id: "read-1",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "The checkbox is gone and the Remove button is no longer present.[web:1]",
        toolCalls: []
      });

    const performAction = vi
      .fn()
      .mockResolvedValueOnce({
        completed_steps: 1,
        steps: [{ index: 0, ok: true }]
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:add\"\n    role: \"button\"\n    name: \"Add\"",
        tree: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "On this page, remove the checkbox and tell me the final state.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The checkbox is gone and the Remove button is no longer present.[web:1]</answer>");
    });

    expect(performAction).toHaveBeenCalledTimes(2);
    expect(performAction).toHaveBeenNthCalledWith(
      1,
      "computer",
      "tab-1",
      {
        steps: [{ kind: "click", ref: "f0:remove" }]
      },
      expect.any(AbortSignal)
    );
    expect(performAction).toHaveBeenNthCalledWith(
      2,
      "read_page",
      "tab-1",
      {
        filter: "interactive"
      },
      expect.any(AbortSignal)
    );

    const thirdTurn = runTurn.mock.calls[2]?.[1];
    expect(
      thirdTurn.messages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Before continuing or answering, verify the result of your most recent page interaction")
      )
    ).toBe(true);
  });

  it("blocks batched state-changing computer steps until the agent validates each action separately", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I'll remove the checkbox and enable the field in one batch.",
        toolCalls: [
          {
            id: "computer-1",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  ref: "f0:remove"
                },
                {
                  kind: "click",
                  ref: "f0:enable"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll remove the checkbox first.",
        toolCalls: [
          {
            id: "computer-2",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  ref: "f0:remove"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll verify the page structure.",
        toolCalls: [
          {
            id: "read-1",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.[web:1]",
        toolCalls: []
      });

    const performAction = vi
      .fn()
      .mockResolvedValueOnce({
        completed_steps: 1,
        steps: [{ index: 0, ok: true }]
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:enable\"\n    role: \"button\"\n    name: \"Enable\"",
        tree: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "On this page, remove the checkbox and enable the input.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.[web:1]</answer>");
    });

    expect(performAction).toHaveBeenCalledTimes(2);
    expect(performAction).toHaveBeenNthCalledWith(
      1,
      "computer",
      "tab-1",
      {
        steps: [{ kind: "click", ref: "f0:remove" }]
      },
      expect.any(AbortSignal)
    );
    expect(performAction).toHaveBeenNthCalledWith(
      2,
      "read_page",
      "tab-1",
      {
        filter: "interactive"
      },
      expect.any(AbortSignal)
    );

    const secondTurn = runTurn.mock.calls[1]?.[1];
    expect(
      secondTurn.messages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "computer" &&
          typeof message.content === "string" &&
          message.content.includes("ACTION_VALIDATION_REQUIRED")
      )
    ).toBe(true);
  });

  it("allows repeated validation reads between separate state-changing actions in a multi-step workflow", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I'll inspect the page first.",
        toolCalls: [
          {
            id: "read-1",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll remove the checkbox first.",
        toolCalls: [
          {
            id: "computer-1",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  ref: "f0:remove"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll verify the page after removing it.",
        toolCalls: [
          {
            id: "read-2",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll inspect once more before enabling the field.",
        toolCalls: [
          {
            id: "read-3",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Now I'll enable the text field.",
        toolCalls: [
          {
            id: "computer-2",
            name: "computer",
            arguments: {
              steps: [
                {
                  kind: "click",
                  ref: "f0:enable"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I'll verify the field is enabled now.",
        toolCalls: [
          {
            id: "read-4",
            name: "read_page",
            arguments: {
              filter: "interactive"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.[web:1]",
        toolCalls: []
      });

    const performAction = vi
      .fn()
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:remove\"\n    role: \"button\"\n    name: \"Remove\"",
        tree: []
      })
      .mockResolvedValueOnce({
        completed_steps: 1,
        steps: [{ index: 0, ok: true }]
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:add\"\n    role: \"button\"\n    name: \"Add\"\n  - ref_id: \"f0:enable\"\n    role: \"button\"\n    name: \"Enable\"",
        tree: []
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:add\"\n    role: \"button\"\n    name: \"Add\"\n  - ref_id: \"f0:enable\"\n    role: \"button\"\n    name: \"Enable\"",
        tree: []
      })
      .mockResolvedValueOnce({
        completed_steps: 1,
        steps: [{ index: 0, ok: true }]
      })
      .mockResolvedValueOnce({
        yaml: "interactables:\n  - ref_id: \"f0:add\"\n    role: \"button\"\n    name: \"Add\"\n  - ref_id: \"f0:input\"\n    role: \"textbox\"\n    name: \"Text field\"",
        tree: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "On this page, remove the checkbox, enable the field, and confirm the state after each action.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.[web:1]</answer>");
    });

    expect(performAction).toHaveBeenCalledTimes(6);
    expect(performAction).toHaveBeenNthCalledWith(
      1,
      "read_page",
      "tab-1",
      {
        filter: "interactive"
      },
      expect.any(AbortSignal)
    );
    expect(performAction).toHaveBeenNthCalledWith(
      6,
      "read_page",
      "tab-1",
      {
        filter: "interactive"
      },
      expect.any(AbortSignal)
    );

    const finalTurn = runTurn.mock.calls[6]?.[1];
    expect(
      finalTurn.messages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "read_page" &&
          typeof message.content === "string" &&
          message.content.includes("LOOP_GUARD")
      )
    ).toBe(false);
  });

  it("accepts todo_write tool calls in the provider loop", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "Writing todos.",
        toolCalls: [
          {
            id: "todo-1",
            name: "todo_write",
            arguments: {
              todos: [
                {
                  content: "Inspect page",
                  status: "in_progress"
                }
              ]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done.[web:1]",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({
      updated: 1,
      todos: [
        {
          content: "Inspect page",
          status: "in_progress"
        }
      ]
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Track progress and then finish",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done.[web:1]</answer>");
    });

    expect(performAction).toHaveBeenCalledWith(
      "todo_write",
      "tab-1",
      {
        todos: [
          {
            content: "Inspect page",
            status: "in_progress"
          }
        ]
      },
      expect.any(AbortSignal)
    );
  });

  it("completes with a guarded fallback answer when the provider loops on the same tool call", async () => {
    const runTurn = vi.fn(async () => ({
      assistantText: "Continuing...",
      toolCalls: [
        {
          id: `loop-call-${runTurn.mock.calls.length + 1}`,
          name: "tabs_create",
          arguments: {
            operation: "list"
          }
        }
      ]
    }));
    const performAction = vi.fn(async () => ({
      tabs: [
        {
          tab_id: "tab-1",
          title: "Tab one"
        }
      ]
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open tabs and keep checking them",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      max_steps: 40
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(typeof state.final_answer).toBe("string");
      expect(state.final_answer?.startsWith("<answer>")).toBe(true);
      const completedStep = state.steps.find((step) => step.action === "execute" && step.status === "completed");
      expect(completedStep?.details?.completed_via).toBe("loop_guard");
    });

    expect(performAction).toHaveBeenCalledTimes(3);
  });

  it("preserves search_web URLs in run sources for source chip rendering", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "Searching the web now.",
        toolCalls: [
          {
            id: "search-1",
            name: "search_web",
            arguments: {
              queries: ["official Python list comprehensions docs"]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "The official docs cover list comprehensions here.[web:1]",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({
      results: [
        {
          id: "web:1",
          title: "5. Data Structures",
          url: "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions",
          snippet: "List comprehensions provide a concise way to create lists."
        }
      ]
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Find the official Python docs for list comprehensions and cite them.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.sources).toContainEqual(
        expect.objectContaining({
          id: "[web:1]",
          origin: "web",
          title: "5. Data Structures",
          url: "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions"
        })
      );
    });
  });

  it("pauses at the next tool boundary, skips stale tool calls, and resumes with reassessment", async () => {
    const toolDeferred = createDeferred<Record<string, unknown>>();
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "Taking the next actions.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://example.com"
            }
          },
          {
            id: "call-2",
            name: "find",
            arguments: {
              query: "Sign in"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Done after reassessing.",
        toolCalls: []
      });
    const performAction = vi.fn(async () => toolDeferred.promise);

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Continue the task",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(() => {
      expect(performAction).toHaveBeenCalledTimes(1);
    });

    await expect(orchestrator.pause({ run_id: started.run_id })).resolves.toEqual({
      run_id: started.run_id,
      status: "pausing"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("pausing");
    });

    toolDeferred.resolve({
      url: "https://example.com"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("paused");
    });

    expect(performAction).toHaveBeenCalledTimes(1);
    expect(performAction).not.toHaveBeenCalledWith(
      "find",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    await expect(orchestrator.resume({ run_id: started.run_id })).resolves.toEqual({
      run_id: started.run_id,
      status: "running"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Done after reassessing.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    const resumedTurn = runTurn.mock.calls[1]?.[1];
    expect(
      resumedTurn.messages.some(
        (message: { role?: string; content?: unknown }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("user took control") &&
          message.content.includes("changed the page")
      )
    ).toBe(true);
  });

  it("holds returned tool calls while paused during provider thinking until the run resumes", async () => {
    const thinkingDeferred = createDeferred<{
      assistantText: string;
      toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
    }>();
    const runTurn = vi
      .fn()
      .mockImplementationOnce(async () => thinkingDeferred.promise)
      .mockResolvedValueOnce({
        assistantText: "Resumed cleanly.",
        toolCalls: []
      });
    const performAction = vi.fn(async () => ({
      url: "https://example.com/account"
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open the account page",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(() => {
      expect(runTurn).toHaveBeenCalledTimes(1);
    });

    await expect(orchestrator.pause({ run_id: started.run_id })).resolves.toEqual({
      run_id: started.run_id,
      status: "pausing"
    });

    thinkingDeferred.resolve({
      assistantText: "I know what to do next.",
      toolCalls: [
        {
          id: "call-1",
          name: "navigate",
          arguments: {
            mode: "to",
            url: "https://example.com/account"
          }
        }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("paused");
    });

    expect(performAction).not.toHaveBeenCalled();

    await expect(orchestrator.resume({ run_id: started.run_id })).resolves.toEqual({
      run_id: started.run_id,
      status: "running"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Resumed cleanly.</answer>");
    });

    expect(performAction).not.toHaveBeenCalled();
    expect(runTurn).toHaveBeenCalledTimes(2);
  });

  it("stops cleanly from a paused run", async () => {
    const toolDeferred = createDeferred<Record<string, unknown>>();
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Navigating first.",
      toolCalls: [
        {
          id: "call-1",
          name: "navigate",
          arguments: {
            mode: "to",
            url: "https://example.com"
          }
        }
      ]
    });
    const performAction = vi.fn(async () => toolDeferred.promise);

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open example.com",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(() => {
      expect(performAction).toHaveBeenCalledTimes(1);
    });

    await orchestrator.pause({ run_id: started.run_id });
    toolDeferred.resolve({
      url: "https://example.com"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("paused");
    });

    await expect(orchestrator.stop({ run_id: started.run_id })).resolves.toEqual({
      run_id: started.run_id,
      status: "stopped"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("stopped");
    });
  });
});
