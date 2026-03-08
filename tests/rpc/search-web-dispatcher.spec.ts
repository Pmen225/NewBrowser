import { describe, expect, it, vi } from "vitest";

import { createSearchWebDispatcher } from "../../sidecar/src/rpc/search-web-dispatcher";

describe("search web dispatcher", () => {
  it("supports canonical and alias action names", () => {
    const dispatcher = createSearchWebDispatcher();
    expect(dispatcher.supports?.("search_web")).toBe(true);
    expect(dispatcher.supports?.("SearchWeb")).toBe(true);
  });

  it("returns normalized results for each query", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          Heading: "Example Heading",
          AbstractText: "Example abstract",
          AbstractURL: "https://example.com",
          RelatedTopics: [
            {
              Text: "Topic 1 - sample snippet",
              FirstURL: "https://example.com/topic-1"
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

    const dispatcher = createSearchWebDispatcher({
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const result = await dispatcher.dispatch(
      "search_web",
      "__system__",
      {
        queries: ["new browser automation"]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      results: [
        {
          id: "web:1",
          title: "Example Heading",
          url: "https://example.com",
          snippet: "Example abstract"
        },
        {
          id: "web:2",
          title: "Topic 1",
          url: "https://example.com/topic-1",
          snippet: "Topic 1 - sample snippet"
        }
      ]
    });
  });

  it("accepts SearchWeb alias action", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          Heading: "Alias Heading",
          AbstractText: "Alias abstract",
          AbstractURL: "https://example.com/alias"
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    });

    const dispatcher = createSearchWebDispatcher({
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const result = await dispatcher.dispatch(
      "SearchWeb",
      "__system__",
      {
        queries: ["alias action"]
      },
      new AbortController().signal
    );

    expect(result).toEqual({
      results: [
        {
          id: "web:1",
          title: "Alias Heading",
          url: "https://example.com/alias",
          snippet: "Alias abstract"
        }
      ]
    });
  });
});
