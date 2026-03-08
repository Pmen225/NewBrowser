import { describe, expect, it, vi } from "vitest";

import { createAnthropicAdapter } from "../../sidecar/src/llm/anthropic";

describe("anthropic runtime adapter", () => {
  it("normalises text blocks from messages.create", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Done." }]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createAnthropicAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "sk-ant",
      model: "claude-3-5-sonnet-latest",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Say done." }
      ],
      tools: [],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    expect(result).toEqual({
      assistantText: "Done.",
      toolCalls: [],
      raw: {
        content: [{ type: "text", text: "Done." }]
      }
    });
  });

  it("normalises tool_use blocks from messages.create", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [
            {
              type: "tool_use",
              id: "call-1",
              name: "navigate",
              input: {
                mode: "forward"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createAnthropicAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "sk-ant",
      model: "claude-3-5-sonnet-latest",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Go forward." }
      ],
      tools: [
        {
          name: "navigate",
          description: "Navigate the browser.",
          parameters: { type: "object" }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    expect(result).toEqual({
      assistantText: undefined,
      toolCalls: [
        {
          id: "call-1",
          name: "navigate",
          arguments: {
            mode: "forward"
          }
        }
      ],
      raw: {
        content: [
          {
            type: "tool_use",
            id: "call-1",
            name: "navigate",
            input: {
              mode: "forward"
            }
          }
        ]
      }
    });
  });
});
