import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, relative } from "node:path";

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
    expect(runTurn.mock.calls[0]?.[1]?.messages).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it("queues steer prompts onto the active run and replays them on the next provider turn", async () => {
    const actionDeferred = createDeferred<{ url: string }>();
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will open the site first.",
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
        assistantText: "I used the updated instruction.",
        toolCalls: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => actionDeferred.promise),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open example.com and summarize it.",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(() => {
      expect(runTurn).toHaveBeenCalledTimes(1);
    });

    await expect(
      orchestrator.steer({
        run_id: started.run_id,
        prompt: "Focus on the pricing section once the page loads."
      })
    ).resolves.toEqual({
      run_id: started.run_id,
      status: "queued",
      queued_count: 1
    });

    actionDeferred.resolve({ url: "https://example.com" });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I used the updated instruction.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    expect(runTurn.mock.calls[1]?.[1]?.messages).toEqual(
      expect.arrayContaining([
        {
          role: "tool",
          tool_name: "navigate",
          tool_call_id: "call-1",
          content: expect.stringContaining("https://example.com")
        },
        {
          role: "user",
          content: "Follow-up from the user while the task was running: Focus on the pricing section once the page loads."
        }
      ])
    );
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
    expect(runTurn.mock.calls[0]?.[1]?.messages).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it("adds plain-language response guidance for ordinary prompts", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "The page explains pricing.[web:1]",
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
      prompt: "Summarize the page in one sentence.",
      provider: "openai",
      model: "gpt-4o-mini",
      api_key: "sk-test"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(
      runTurn.mock.calls[0]?.[1]?.messages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "system" &&
          typeof message.content === "string" &&
          message.content.includes("Default to plain language with short paragraphs")
      )
    ).toBe(true);
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

  it("retries once when the model falsely refuses an allowed browser admin request", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I am unable to navigate to chrome://settings directly. This is a restricted internal Chrome page that I cannot access.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "The main heading is Settings.",
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
      prompt: "Open chrome://settings and tell me the main heading on that page.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The main heading is Settings.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    const retryMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Browser admin pages were explicitly allowed")
      )
    ).toBe(true);
  });

  it("forces a page inspection after an allowed browser-admin navigation before accepting an answer", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will open the requested settings page.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "url",
              url: "chrome://settings"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I am unable to open chrome://settings directly. I cannot access internal Chrome URLs.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "I will inspect the current page.",
        toolCalls: [
          {
            id: "call-2",
            name: "read_page",
            arguments: {}
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "The main heading is Settings.",
        toolCalls: []
      });

    const performAction = vi.fn(async (action: string) => {
      if (action === "navigate") {
        return { url: "chrome://settings" };
      }
      if (action === "read_page") {
        return {
          title: "Settings",
          text: "You and Google Chrome"
        };
      }
      return {};
    });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open chrome://settings and tell me the first visible line only.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The main heading is Settings. [web:1]</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(4);
    const retryMessages = runTurn.mock.calls[2]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Navigation already succeeded")
      )
    ).toBe(true);
  });

  it("falls back to the observed browser-admin title when the page is open but the model still refuses", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will open the requested settings page.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "primary",
              url: "chrome://settings"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I am unable to open chrome://settings directly. This is an internal Chrome URL that the browser automation tool cannot access.",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({
      url: "chrome://settings/",
      title: "Settings"
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open chrome://settings and tell me the main heading only.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The main heading is Settings.</answer>");
    });
  });

  it("falls back to the inferred browser-admin title for chrome://flags when the model still refuses", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will open the requested flags page.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "primary",
              url: "chrome://flags"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I am unable to access chrome://flags. This is likely an unsupported URL in this browsing environment.",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({
      url: "chrome://flags/"
    }));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt: "Open chrome://flags and tell me the main heading only.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The main heading is Experiments.</answer>");
    });
  });

  it("retries once when the model falsely denies provided memory on a recall prompt", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I don't have any instructions from Prince.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "Prince wants the assistant to investigate before emailing users.",
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
      prompt: "What do you remember about how Prince wants you to work?",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      memory_items: [
        {
          id: "manual:ops-style",
          source: "manual",
          title: "Manual memory",
          text: "Prince wants the assistant to investigate before emailing users."
        }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Prince wants the assistant to investigate before emailing users.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    const retryMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Local memory was provided for this run")
      )
    ).toBe(true);
  });

  it("falls back to provided memory when recall still fails after the retry", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I don't have any instructions from Prince.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "I don't remember anything about Prince. I am the New Browser assistant.",
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
      prompt: "What do you remember about how Prince wants you to work?",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      memory_items: [
        {
          id: "manual:ops-style",
          source: "manual",
          title: "Manual memory",
          text: "Prince wants the assistant to investigate before emailing users."
        }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Prince wants the assistant to investigate before emailing users.</answer>");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
  });

  it("prefers manual memory over settings memory in the final recall fallback", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I don't have any instructions from Prince.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "I do not have any information or instructions from an individual named Prince. My operational guidelines come from the New Browser team.",
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
      prompt: "What do you remember about how Prince wants you to work?",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      memory_items: [
        {
          id: "settings:current",
          source: "settings",
          title: "Current settings",
          text: "Dictation enabled with models/gemini-2.5-flash."
        },
        {
          id: "manual:ops-style",
          source: "manual",
          title: "Manual memory",
          text: "Prince wants the assistant to investigate before emailing users."
        }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>Prince wants the assistant to investigate before emailing users.</answer>");
    });
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

  it("keeps tabs_create available for ordinary navigation prompts", async () => {
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
    expect(toolNames).toContain("tabs_create");
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

  it("does not expose terminal_exec unless local shell access was explicitly enabled", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I summarized the page.",
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
      prompt: "Check the repo status and summarize it.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const toolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
    expect(toolNames).not.toContain("terminal_exec");
    expect(toolNames).not.toContain("workspace_list");
    expect(toolNames).not.toContain("workspace_read");
    expect(toolNames).not.toContain("workspace_write");
  });

  it("exposes terminal_exec when local shell access is enabled and returns command output to the parent loop", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will inspect the local workspace first.",
        toolCalls: [
          {
            id: "call-1",
            name: "terminal_exec",
            arguments: {
              command: `${JSON.stringify(process.execPath)} -e "process.stdout.write('atlas-shell-ok')"`
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "The local shell ran successfully.",
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
      prompt: "Inspect the local workspace and tell me if shell access works.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_local_shell: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>The local shell ran successfully.</answer>");
    });

    const toolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("terminal_exec");

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" && message.content.includes("local shell access")
      )
    ).toBe(true);

    const resumedMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      resumedMessages.some(
        (message: { role?: string; tool_name?: string; content?: string }) =>
          message.role === "tool" &&
          message.tool_name === "terminal_exec" &&
          typeof message.content === "string" &&
          message.content.includes("atlas-shell-ok")
      )
    ).toBe(true);
  });

  it("exposes workspace tools with local shell access and can write then read a workspace file", async () => {
    const workspaceDir = await mkdtemp(join(process.cwd(), "tmp/workspace-tools-"));
    const filePath = join(workspaceDir, "notes", "shift-summary.txt");
    const relativePath = relative(process.cwd(), filePath);

    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will write the file first.",
        toolCalls: [
          {
            id: "call-write",
            name: "workspace_write",
            arguments: {
              path: relativePath,
              content: "Inbox cleared.\nTickets triaged.",
              mode: "overwrite"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I will verify the written file.",
        toolCalls: [
          {
            id: "call-read",
            name: "workspace_read",
            arguments: {
              path: relativePath
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I wrote and verified the workspace file.",
        toolCalls: []
      });

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction: vi.fn(async () => ({})),
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    try {
      const started = await orchestrator.run({
        prompt: "Create a short shift summary file in the workspace and verify it.",
        provider: "google",
        model: "models/gemini-2.5-flash",
        api_key: "test-key",
        allow_local_shell: true
      });

      await vi.waitFor(async () => {
        const state = await orchestrator.getState({ run_id: started.run_id });
        expect(state.status).toBe("completed");
        expect(state.final_answer).toBe("<answer>I wrote and verified the workspace file.</answer>");
      });

      const toolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
      expect(toolNames).toContain("workspace_list");
      expect(toolNames).toContain("workspace_read");
      expect(toolNames).toContain("workspace_write");

      const saved = await readFile(filePath, "utf8");
      expect(saved).toBe("Inbox cleared.\nTickets triaged.");

      const secondTurnMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
      expect(
        secondTurnMessages.some(
          (message: { role?: string; tool_name?: string; content?: string }) =>
            message.role === "tool" &&
            message.tool_name === "workspace_write" &&
            typeof message.content === "string" &&
            message.content.includes(relativePath)
        )
      ).toBe(true);

      const thirdTurnMessages = runTurn.mock.calls[2]?.[1]?.messages ?? [];
      expect(
        thirdTurnMessages.some(
          (message: { role?: string; tool_name?: string; content?: string }) =>
            message.role === "tool" &&
            message.tool_name === "workspace_read" &&
            typeof message.content === "string" &&
            message.content.includes("Tickets triaged.")
        )
      ).toBe(true);
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });

  it("adds explicit capability guidance for allowed browser admin pages", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Opened settings.",
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
      prompt: "Open chrome://settings and tell me the heading.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" && message.content.includes("Do not say those pages are inaccessible.")
      )
    ).toBe(true);
  });

  it("keeps browser admin capability active for generic prompts when the run explicitly allowed it", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I can use browser-admin pages in this run.",
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
      prompt: "Check the repo and stay ready for privileged browser work.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" && message.content.includes("browser admin pages for this run")
      )
    ).toBe(true);
  });

  it("adds explicit capability guidance for allowed extension management", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I listed the extensions.",
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
      prompt: "List my extensions and tell me whether Atlas can be disabled.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_extension_management: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" && message.content.includes("Never disable or uninstall the Assistant extension itself")
      )
    ).toBe(true);
  });

  it("adds explicit completion guidance for file upload tasks", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "The file upload is complete.",
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
      prompt: 'Upload the file "/tmp/test.txt" on this page and tell me the uploaded filename.',
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" &&
        message.content.includes("selecting a file is not enough") &&
        message.content.includes("Upload or Submit control")
      )
    ).toBe(true);
  });

  it("exposes extension management for natural installed-browser-extensions wording", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I listed the installed browser extensions.",
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
      prompt: "List the installed browser extensions only.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_extension_management: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const tools = runTurn.mock.calls[0]?.[1]?.tools ?? [];
    expect(tools.some((tool: { name?: string }) => tool.name === "extensions_manage")).toBe(true);
  });

  it("keeps extension management exposed for generic prompts when the run explicitly allowed it", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Extension management is available.",
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
      prompt: "Audit the environment and keep privileged tools available.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_extension_management: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const tools = runTurn.mock.calls[0]?.[1]?.tools ?? [];
    expect(tools.some((tool: { name?: string }) => tool.name === "extensions_manage")).toBe(true);
  });

  it("injects local memory with explicit recall guidance", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "Prince wants careful investigations before user emails.",
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
      prompt: "What do you remember about how Prince wants you to work?",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      memory_items: [
        {
          id: "manual:ops-style",
          source: "manual",
          title: "Manual memory",
          text: "Prince works IT support in Microsoft admin portals and wants the assistant to investigate before emailing users."
        }
      ]
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" &&
        message.content.includes("If the user asks what you remember") &&
        message.content.includes("Prince works IT support in Microsoft admin portals")
      )
    ).toBe(true);
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

  it("exposes create_subagent to the model and returns the child summary into the parent tool loop", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "Delegating the verification step.",
        toolCalls: [
          {
            id: "parent-call-1",
            name: "create_subagent",
            arguments: {
              prompt: "Check the delegated workflow and return the result only.",
              goal_summary: "Verify the delegated workflow"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "Child completed the delegated workflow.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "Parent finished with the delegated evidence.",
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
      prompt: "Handle the main task and delegate if needed.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toContain("Parent finished");
    });

    const parentToolNames = (runTurn.mock.calls[0]?.[1]?.tools ?? []).map((tool: { name: string }) => tool.name);
    expect(parentToolNames).toContain("create_subagent");

    const resumedParentMessages = runTurn.mock.calls[2]?.[1]?.messages ?? [];
    const subagentToolResult = resumedParentMessages.find((message: { role?: string; tool_name?: string }) =>
      message?.role === "tool" && message?.tool_name === "create_subagent"
    );
    expect(subagentToolResult?.content).toContain("Child completed the delegated workflow.");
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

  it("adds current-page guidance before the model starts navigating away", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I will inspect the current page first.",
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
      prompt: "Validate whether this criticism of the current website is correct.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const systemMessages = (runTurn.mock.calls[0]?.[1]?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" &&
        message.content.includes("Inspect the current page before navigating anywhere else.") &&
        message.content.includes("do not conclude the whole site is unavailable")
      )
    ).toBe(true);
  });

  it("treats current-website validation prompts as page-grounded local tasks", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I will validate the current website from the observed page.",
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
      prompt:
        "Looking at the current website of Maranatha College of Wisdom, validate whether the criticism about missing mission, vision, brochure, and assessments is correct.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
    });

    const firstTurn = runTurn.mock.calls[0]?.[1];
    expect(firstTurn?.allowBrowserSearch).toBe(false);
    expect(firstTurn?.tools.some((tool: { name?: string }) => tool.name === "search_web")).toBe(false);

    const systemMessages = (firstTurn?.messages ?? []).filter((message: { role?: string }) => message.role === "system");
    expect(
      systemMessages.some((message: { content?: string }) =>
        typeof message.content === "string" &&
        message.content.includes("Inspect the current page before navigating anywhere else.") &&
        message.content.includes("Do not guess internal page slugs") &&
        message.content.includes("same website before using any outside sources")
      )
    ).toBe(true);
  });

  it("retries once when the model overgeneralizes one failed page into a whole-site outage", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText:
          "I am unable to validate the criticism because the website may be inaccessible or not functioning after the attempted pages timed out.",
        toolCalls: []
      })
      .mockResolvedValueOnce({
        assistantText: "From the current website page, aims are visible, but mission, vision, brochure, and assessments are not clearly present.",
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
      prompt:
        "Looking at the current website of Maranatha College of Wisdom, validate this criticism and do not guess.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toContain("aims are visible");
    });

    expect(runTurn).toHaveBeenCalledTimes(2);
    const retryMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.includes("Do not conclude the whole website is inaccessible") &&
          message.content.includes("Inspect the current page")
      )
    ).toBe(true);
  });

  it("blocks off-site navigation before first inspection on current-website validation tasks", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will look up the website first.",
        toolCalls: [
          {
            id: "call-1",
            name: "navigate",
            arguments: {
              mode: "to",
              url: "https://www.google.com/search?q=Maranatha+College+of+Wisdom+website"
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I need to inspect the current website before leaving it.",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({}));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt:
        "Looking at the current website of Maranatha College of Wisdom, validate this criticism and do not guess.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I need to inspect the current website before leaving it.</answer>");
    });

    expect(performAction).not.toHaveBeenCalled();
    const retryMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "tool" &&
          typeof message.content === "string" &&
          message.content.includes("CURRENT_SITE_INSPECTION_REQUIRED")
      )
    ).toBe(true);
  });

  it("blocks blind interactive actions for non-interactive current-website validation tasks", async () => {
    const runTurn = vi
      .fn()
      .mockResolvedValueOnce({
        assistantText: "I will interact with the page to investigate.",
        toolCalls: [
          {
            id: "call-1",
            name: "computer",
            arguments: {
              steps: [{ kind: "click" }]
            }
          }
        ]
      })
      .mockResolvedValueOnce({
        assistantText: "I should gather evidence from the current website without clicking blindly.",
        toolCalls: []
      });

    const performAction = vi.fn(async () => ({}));

    const orchestrator = await createOrchestrator({
      resolveDefaultTabId: () => "tab-1",
      performAction,
      providerRegistry: {
        runTurn
      } as ProviderRegistry
    });

    const started = await orchestrator.run({
      prompt:
        "Looking at the current website of Maranatha College of Wisdom, validate this criticism and do not guess.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key"
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
      expect(state.final_answer).toBe("<answer>I should gather evidence from the current website without clicking blindly.</answer>");
    });

    expect(performAction).not.toHaveBeenCalled();
    const retryMessages = runTurn.mock.calls[1]?.[1]?.messages ?? [];
    expect(
      retryMessages.some(
        (message: { role?: string; content?: string }) =>
          message.role === "tool" &&
          typeof message.content === "string" &&
          message.content.includes("CURRENT_SITE_NONINTERACTIVE_REVIEW_REQUIRED")
      )
    ).toBe(true);
  });

  it("suppresses web search tools for explicit browser admin prompts", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      assistantText: "I can handle that in browser settings.",
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
      prompt: "Open chrome://settings and tell me the main heading on that page.",
      provider: "google",
      model: "models/gemini-2.5-flash",
      api_key: "test-key",
      allow_browser_admin_pages: true
    });

    await vi.waitFor(async () => {
      const state = await orchestrator.getState({ run_id: started.run_id });
      expect(state.status).toBe("completed");
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
      expect(state.final_answer).toBe("<answer>Done.</answer>");
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
