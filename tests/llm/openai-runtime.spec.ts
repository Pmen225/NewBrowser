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

  it("sends Responses API input items in the current official shape", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
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
    await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Look at this image." },
        {
          role: "tool",
          tool_call_id: "call-1",
          tool_name: "read_page",
          content: "{\"ok\":true}"
        }
      ],
      tools: [
        {
          name: "read_page",
          description: "Read the page.",
          parameters: { type: "object" }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const payload = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(payload.reasoning).toBeUndefined();
    expect(payload.input).toEqual([
      {
        type: "message",
        role: "developer",
        content: [
          {
            type: "input_text",
            text: "You are helpful."
          }
        ]
      },
      {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Look at this image."
          }
        ]
      },
      {
        type: "function_call_output",
        call_id: "call-1",
        output: "{\"ok\":true}"
      }
    ]);
  });

  it("includes reasoning only for models that support it", async () => {
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
    await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "gpt-5.2",
      messages: [
        { role: "user", content: "Think harder." }
      ],
      tools: [],
      thinkingLevel: "high",
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const payload = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(payload.reasoning).toEqual({
      effort: "high"
    });
  });

  it("surfaces provider error messages from the OpenAI response body", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: "Unsupported parameter: 'reasoning.effort' is not supported with this model."
          }
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createOpenAiAdapter(fetchImpl as unknown as typeof fetch);
    await expect(
      adapter.runTurn?.({
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "Say hello." }
        ],
        tools: [],
        thinkingLevel: "high",
        allowBrowserSearch: false,
        allowCodeExecution: false,
        preferVision: false
      })
    ).rejects.toMatchObject({
      code: "PROVIDER_HTTP_ERROR",
      message: "Unsupported parameter: 'reasoning.effort' is not supported with this model."
    });
  });

  it("maps insufficient quota into an actionable provider message", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "insufficient_quota",
            message: "You exceeded your current quota, please check your plan and billing details."
          }
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createOpenAiAdapter(fetchImpl as unknown as typeof fetch);
    await expect(
      adapter.runTurn?.({
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "Say hello." }
        ],
        tools: [],
        allowBrowserSearch: false,
        allowCodeExecution: false,
        preferVision: false
      })
    ).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      message: "OpenAI quota exceeded. Check billing or switch providers."
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
