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
});
