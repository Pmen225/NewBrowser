import type { PromptPolicy } from "./types";

function normalizeWhitespace(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function compilePromptPolicy(systemPrompt: string, toolNames: string[]): PromptPolicy {
  const normalizedPrompt = normalizeWhitespace(systemPrompt);
  const toolSet = new Set(toolNames.map((value) => value.toLowerCase()));

  return {
    inspectBeforeInteractiveActions:
      toolSet.has("read_page") &&
      normalizedPrompt.includes("first seeks to understand the page's content, layout, and structure before taking action"),
    preferReadPageForInspection:
      toolSet.has("read_page") &&
      normalizedPrompt.includes("either by using `read_page`"),
    preferGetPageTextForLongReading:
      toolSet.has("get_page_text") &&
      (normalizedPrompt.includes("\"get_page_text\" tool") ||
        normalizedPrompt.includes("`get_page_text`") ||
        normalizedPrompt.includes("get_page_text")),
    preferSearchWebForGeneralSearch:
      toolSet.has("search_web") &&
      normalizedPrompt.includes("never use google.com for search, always use `search_web`"),
    requireFrequentTodoTracking:
      toolSet.has("todo_write"),
    requireSameLanguageResponses:
      normalizedPrompt.includes("always respond in the same language as the user's query"),
    requireInlineCitations:
      normalizedPrompt.includes("your answer must contain citations"),
    disallowRawIdsInFinalResponse:
      normalizedPrompt.includes("never expose or mention full raw ids"),
    disallowRawToolTagsInFinalResponse:
      normalizedPrompt.includes("never display any raw tool tags"),
    disallowBibliographySection:
      normalizedPrompt.includes("never include a bibliography") ||
      normalizedPrompt.includes("references section"),
    disallowLyrics:
      normalizedPrompt.includes("never reproduce or quote song lyrics"),
    requireTableHeaderRows:
      normalizedPrompt.includes("always include a header row separated by dashes"),
    requireImageAcknowledgement:
      normalizedPrompt.includes("always acknowledge when an image is provided"),
    disallowExternalImageTransmission:
      normalizedPrompt.includes("never share or transmit images to external services"),
    blockGoogleSearchNavigation:
      normalizedPrompt.includes("never use google.com for search"),
    blockArchiveAccess:
      normalizedPrompt.includes("archive sites") &&
      normalizedPrompt.includes("cached versions"),
    blockSensitiveQueryParams:
      normalizedPrompt.includes("never include sensitive data in url parameters or query strings"),
    blockPasswordEntry:
      normalizedPrompt.includes("never authorize password-based access"),
    blockSensitiveIdentityFinancialInput:
      normalizedPrompt.includes("never provide credit card or bank details") ||
      normalizedPrompt.includes("never enter sensitive financial or identity information"),
    blockSensitiveBrowserDataAccess:
      normalizedPrompt.includes("never access browser settings, saved passwords, or autofill data") ||
      normalizedPrompt.includes("browser history, bookmarks, and saved passwords are never"),
    blockHarmfulSearches:
      normalizedPrompt.includes("never help users locate harmful online sources") ||
      normalizedPrompt.includes("never scrape or gather facial images")
  };
}
