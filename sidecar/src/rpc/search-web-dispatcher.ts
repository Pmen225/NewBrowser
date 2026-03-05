import { parseSearchWebParams, type JsonObject, type SearchWebResultItem } from "../../../shared/src/transport";
import type { ActionDispatcher } from "./dispatcher";

export interface SearchWebDispatcherOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface DuckDuckGoTopic {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoTopic[];
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): Error & {
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
} {
  const error = new Error(message) as Error & {
    code: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function flattenTopics(topics: DuckDuckGoTopic[] | undefined, acc: DuckDuckGoTopic[]): void {
  if (!Array.isArray(topics)) {
    return;
  }

  for (const topic of topics) {
    if (topic.Topics && Array.isArray(topic.Topics)) {
      flattenTopics(topic.Topics, acc);
      continue;
    }
    acc.push(topic);
  }
}

async function queryDuckDuckGo(
  fetchImpl: typeof fetch,
  query: string,
  timeoutMs: number
): Promise<Pick<SearchWebResultItem, "title" | "url" | "snippet">[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }

  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw createDispatcherError("SEARCH_HTTP_ERROR", `search_web failed with HTTP ${response.status}`, true);
    }

    const payload = (await response.json()) as DuckDuckGoResponse;
    const results: Array<Pick<SearchWebResultItem, "title" | "url" | "snippet">> = [];

    if (payload.AbstractURL && payload.AbstractText) {
      results.push({
        title: payload.Heading || query,
        url: payload.AbstractURL,
        snippet: payload.AbstractText
      });
    }

    const flattenedTopics: DuckDuckGoTopic[] = [];
    flattenTopics(payload.RelatedTopics, flattenedTopics);
    for (const topic of flattenedTopics) {
      if (!topic.FirstURL || !topic.Text) {
        continue;
      }

      const title = topic.Text.split(" - ")[0]?.trim() || topic.FirstURL;
      results.push({
        title,
        url: topic.FirstURL,
        snippet: topic.Text
      });
    }

    return results.slice(0, 5);
  } finally {
    clearTimeout(timer);
  }
}

export function createSearchWebDispatcher(options: SearchWebDispatcherOptions = {}): ActionDispatcher {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs =
    typeof options.timeoutMs === "number" && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? Math.floor(options.timeoutMs)
      : 12_000;

  return {
    supports(action: string): boolean {
      return action === "search_web" || action === "SearchWeb";
    },
    async dispatch(action: string, _tabId: string, params: JsonObject): Promise<JsonObject> {
      if (action !== "search_web" && action !== "SearchWeb") {
        throw createDispatcherError("UNKNOWN_ACTION", `Unknown action: ${action}`, false);
      }

      const parsed = parseSearchWebParams(params);
      if (!parsed) {
        throw createDispatcherError("INVALID_REQUEST", "Invalid search_web params", false);
      }

      const results: SearchWebResultItem[] = [];
      let index = 1;
      for (const query of parsed.queries) {
        const queryResults = await queryDuckDuckGo(fetchImpl, query, timeoutMs);
        for (const item of queryResults) {
          results.push({
            id: `web:${index}`,
            title: item.title,
            url: item.url,
            snippet: item.snippet
          });
          index += 1;
        }
      }

      return {
        results
      };
    }
  };
}
