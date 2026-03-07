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
  // Try HTML search first (returns real web results)
  const htmlResults = await queryDuckDuckGoHtml(fetchImpl, query, timeoutMs);
  if (htmlResults.length > 0) {
    return htmlResults;
  }

  // Fall back to Instant Answers API for entity lookups
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  if (typeof timer.unref === "function") { timer.unref(); }

  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw createDispatcherError("SEARCH_HTTP_ERROR", `search_web failed with HTTP ${response.status}`, true);
    }

    const payload = (await response.json()) as DuckDuckGoResponse;
    const results: Array<Pick<SearchWebResultItem, "title" | "url" | "snippet">> = [];

    if (payload.AbstractURL && payload.AbstractText) {
      results.push({ title: payload.Heading || query, url: payload.AbstractURL, snippet: payload.AbstractText });
    }

    const flattenedTopics: DuckDuckGoTopic[] = [];
    flattenTopics(payload.RelatedTopics, flattenedTopics);
    for (const topic of flattenedTopics) {
      if (!topic.FirstURL || !topic.Text) continue;
      const title = topic.Text.split(" - ")[0]?.trim() || topic.FirstURL;
      results.push({ title, url: topic.FirstURL, snippet: topic.Text });
    }

    return results.slice(0, 5);
  } finally {
    clearTimeout(timer);
  }
}

async function queryDuckDuckGoHtml(
  fetchImpl: typeof fetch,
  query: string,
  timeoutMs: number
): Promise<Pick<SearchWebResultItem, "title" | "url" | "snippet">[]> {
  // DuckDuckGo HTML endpoint — returns real organic web results
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  url.searchParams.set("kl", "uk-en");

  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
  if (typeof timer.unref === "function") { timer.unref(); }

  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: Array<Pick<SearchWebResultItem, "title" | "url" | "snippet">> = [];

    // Parse result blocks: <div class="result__body"> ... </div>
    const resultRe = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;

    while ((match = resultRe.exec(html)) !== null && results.length < 6) {
      const rawUrl = match[1] ?? "";
      const rawTitle = match[2]?.replace(/<[^>]+>/g, "").trim() ?? "";
      const rawSnippet = match[3]?.replace(/<[^>]+>/g, "").trim() ?? "";

      // DDG HTML wraps URLs as /l/?uddg=<encoded>
      let resolvedUrl = rawUrl;
      try {
        const wrapped = new URL(rawUrl, "https://html.duckduckgo.com");
        const uddg = wrapped.searchParams.get("uddg");
        if (uddg) resolvedUrl = decodeURIComponent(uddg);
      } catch {}

      if (!rawTitle || !resolvedUrl) continue;
      results.push({ title: rawTitle, url: resolvedUrl, snippet: rawSnippet });
    }

    return results;
  } catch {
    return [];
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
