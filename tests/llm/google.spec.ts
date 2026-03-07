import { describe, expect, it, vi } from "vitest";

import { createGoogleAdapter } from "../../sidecar/src/llm/google";

describe("google adapter", () => {
  it("uses v1beta /models endpoint and passes API key via query string", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          models: [{ name: "models/gemini-1.5-flash" }]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.listModels({
      provider: "google",
      api_key: "google-key"
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestUrl = fetchImpl.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe("string");
    expect(requestUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models?key=google-key");
  });

  it("adds curated Gemini browser-control models to the synced list and keeps 2.5 flash as the safe default", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          models: [{ name: "models/gemini-2.5-flash" }]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.listModels({
      provider: "google",
      api_key: "google-key"
    });

    expect(result.models).toEqual(expect.arrayContaining([
      "models/gemini-flash-latest",
      "models/gemini-flash-lite-latest",
      "models/gemini-2.5-flash",
      "models/gemini-2.5-flash-lite",
      "models/gemini-3-flash-preview",
      "models/gemini-3.1-flash-lite-preview",
      "models/gemini-2.5-pro",
      "models/gemini-3-pro-preview",
      "models/gemini-3.1-pro-preview",
      "models/gemini-2.5-flash-image"
    ]));
    expect(result.default_model).toBe("models/gemini-2.5-flash");
  });

  it("normalises function calls from generateContent", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "navigate",
                      args: {
                        mode: "back"
                      }
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "google-key",
      model: "models/gemini-1.5-flash",
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
          id: "google-tool-1",
          name: "navigate",
          arguments: {
            mode: "back"
          }
        }
      ],
      provider_parts: [
        {
          functionCall: {
            name: "navigate",
            args: {
              mode: "back"
            }
          }
        }
      ],
      finishReason: undefined,
      raw: {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "navigate",
                    args: {
                      mode: "back"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    });
  });

  it("normalises bare Gemini model IDs to models/* path for generateContent", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "ok" }]
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "google-key",
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      tools: [],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestUrl = fetchImpl.mock.calls[0]?.[0];
    expect(typeof requestUrl).toBe("string");
    expect(requestUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=google-key");
  });

  it("serializes multimodal tool results without embedding images in functionResponse", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "done" }]
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "google-key",
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call-1",
              name: "computer",
              arguments: { action: "screenshot" }
            }
          ]
        },
        {
          role: "tool",
          tool_call_id: "call-1",
          tool_name: "computer",
          content: [
            { type: "text", text: "{\"ok\":true,\"caption\":\"Visible state\"}" },
            { type: "image", media_type: "image/png", data: "ZmFrZS1pbWFnZQ==" }
          ]
        }
      ],
      tools: [
        {
          name: "computer",
          description: "Interact with the current page.",
          parameters: { type: "object" }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: true
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}"));
    expect(body.contents).toEqual([
      {
        role: "model",
        parts: [
          {
            functionCall: {
              name: "computer",
              args: { action: "screenshot" }
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: "computer",
              response: {
                ok: true,
                caption: "Visible state"
              }
            }
          }
        ]
      },
      {
        role: "user",
        parts: [
          { text: "Tool visual artifact attached for inspection." },
          { inlineData: { mimeType: "image/png", data: "ZmFrZS1pbWFnZQ==" } }
        ]
      }
    ]);
  });

  it("sanitizes unsupported Gemini function declaration schema keywords before sending tools", async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "ok" }]
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "google-key",
      model: "models/gemini-2.5-flash",
      messages: [{ role: "user", content: "Fill the form." }],
      tools: [
        {
          name: "form_input",
          description: "Fill form fields.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    ref: { type: "string" },
                    kind: { type: "string", enum: ["text", "checkbox"] },
                    value: {
                      oneOf: [{ type: "string" }, { type: "boolean" }]
                    }
                  },
                  required: ["ref", "kind", "value"]
                }
              }
            },
            required: ["fields"]
          }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}"));
    expect(body.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: "form_input",
            description: "Fill form fields.",
            parameters: {
              type: "object",
              properties: {
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ref: { type: "string" },
                      kind: { type: "string", enum: ["text", "checkbox"] },
                      value: {
                        anyOf: [{ type: "string" }, { type: "boolean" }]
                      }
                    },
                    required: ["ref", "kind", "value"]
                  }
                }
              },
              required: ["fields"]
            }
          }
        ]
      }
    ]);
  });

  it("includes thinking and function calling config in generateContent requests for tool turns", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: "ok" }]
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    await adapter.runTurn?.({
      apiKey: "google-key",
      model: "models/gemini-2.5-flash",
      messages: [{ role: "user", content: "Use a tool." }],
      tools: [
        {
          name: "read_page",
          description: "Inspect the current page.",
          parameters: { type: "object" }
        }
      ],
      thinkingLevel: "medium",
      functionCallingMode: "VALIDATED",
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}"));
    expect(body.toolConfig).toEqual({
      functionCallingConfig: {
        mode: "VALIDATED"
      }
    });
    expect(body.generationConfig).toEqual({
      thinkingConfig: {
        thinkingBudget: 1024
      }
    });
  });

  it("preserves raw Gemini assistant parts and finishReason for multi-turn replay", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "read_page",
                      args: {}
                    },
                    thoughtSignature: "sig-1"
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

    const adapter = createGoogleAdapter(fetchImpl as unknown as typeof fetch);
    const result = await adapter.runTurn?.({
      apiKey: "google-key",
      model: "models/gemini-2.5-flash",
      messages: [
        { role: "user", content: "Inspect the page." }
      ],
      tools: [
        {
          name: "read_page",
          description: "Inspect the current page.",
          parameters: { type: "object" }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    expect(result).toEqual(expect.objectContaining({
      finishReason: "STOP",
      provider_parts: [
        {
          functionCall: {
            name: "read_page",
            args: {}
          },
          thoughtSignature: "sig-1"
        }
      ]
    }));

    fetchImpl.mockClear();
    await adapter.runTurn?.({
      apiKey: "google-key",
      model: "models/gemini-2.5-flash",
      messages: [
        { role: "user", content: "Inspect the page." },
        {
          role: "assistant",
          content: "",
          provider_parts: [
            {
              functionCall: {
                name: "read_page",
                args: {}
              },
              thoughtSignature: "sig-1"
            }
          ],
          tool_calls: [
            {
              id: "call-1",
              name: "read_page",
              arguments: {}
            }
          ]
        }
      ],
      tools: [
        {
          name: "read_page",
          description: "Inspect the current page.",
          parameters: { type: "object" }
        }
      ],
      allowBrowserSearch: false,
      allowCodeExecution: false,
      preferVision: false
    });

    const [, replayInit] = fetchImpl.mock.calls[0] ?? [];
    const replayBody = JSON.parse(String((replayInit as RequestInit | undefined)?.body ?? "{}"));
    expect(replayBody.contents[1]).toEqual({
      role: "model",
      parts: [
        {
          functionCall: {
            name: "read_page",
            args: {}
          },
          thoughtSignature: "sig-1"
        }
      ]
    });
  });
});
