import { describe, expect, it, vi } from "vitest";

import { createOpenAiAdapter } from "../../sidecar/src/llm/openai";

describe("openai runtime adapter", () => {
  it("normalises plain text responses from the Responses API", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          output_text: "Done."
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createOpenAiAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
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
        output_text: "Done."
      }
    });
  });

  it("normalises function tool calls from the Responses API", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              call_id: "call-1",
              name: "navigate",
              arguments: "{\"mode\":\"back\"}"
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

    const adapter = createOpenAiAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Go back." }
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
            mode: "back"
          }
        }
      ],
      raw: {
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "navigate",
            arguments: "{\"mode\":\"back\"}"
          }
        ]
      }
    });
  });
});
