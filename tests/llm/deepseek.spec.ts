import { describe, expect, it, vi } from "vitest";

import { createDeepSeekAdapter } from "../../sidecar/src/llm/deepseek";

describe("deepseek adapter", () => {
  it("lists models and validates selected model", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [{ id: "deepseek-chat" }, { id: "deepseek-reasoner" }]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createDeepSeekAdapter(fetchImpl as unknown as typeof fetch);

    const list = await adapter.listModels({
      provider: "deepseek",
      api_key: "sk-test"
    });
    expect(list.models).toEqual(["deepseek-chat", "deepseek-reasoner"]);

    const validate = await adapter.validate({
      provider: "deepseek",
      api_key: "sk-test",
      model: "deepseek-chat"
    });
    expect(validate.ok).toBe(true);
  });

  it("uses /models on the default base URL", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [{ id: "deepseek-chat" }]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createDeepSeekAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.listModels({
      provider: "deepseek",
      api_key: "sk-test"
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestUrl = fetchImpl.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe("string");
    expect(requestUrl).toBe("https://api.deepseek.com/models");
  });

  it("normalises chat completion tool calls", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: "call-1",
                    function: {
                      name: "navigate",
                      arguments: "{\"mode\":\"forward\"}"
                    }
                  }
                ]
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

    const adapter = createDeepSeekAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "deepseek-chat",
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
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: "call-1",
                  function: {
                    name: "navigate",
                    arguments: "{\"mode\":\"forward\"}"
                  }
                }
              ]
            }
          }
        ]
      }
    });
  });

  it("preserves assistant tool calls and omits tool message name fields from DeepSeek requests", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "done"
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

    const adapter = createDeepSeekAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "deepseek-chat",
      messages: [
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call-1",
              name: "read_page",
              arguments: { mode: "summary" }
            }
          ]
        },
        {
          role: "tool",
          tool_call_id: "call-1",
          tool_name: "read_page",
          content: "{\"ok\":true}"
        }
      ],
      tools: [],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const requestInit = fetchImpl.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    const body = JSON.parse(String(requestInit?.body));
    expect(body.messages).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "read_page",
              arguments: "{\"mode\":\"summary\"}"
            }
          }
        ]
      },
      { role: "tool", tool_call_id: "call-1", content: "{\"ok\":true}" }
    ]);
  });

  it("flattens structured content parts into DeepSeek string messages", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "done"
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

    const adapter = createDeepSeekAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "sk-test",
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "First line." },
            { type: "image", media_type: "image/png", data: "abcd" },
            { type: "text", text: "Second line." }
          ]
        }
      ],
      tools: [],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const requestInit = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(requestInit?.body));
    expect(body.messages).toEqual([
      {
        role: "user",
        content: "First line.\n[image omitted: image/png]\nSecond line."
      }
    ]);
  });
});
