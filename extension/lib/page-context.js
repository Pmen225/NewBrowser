function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

const WEB_TAB_QUERY = ["http://*/*", "https://*/*"];
const PAGE_CONTEXT_PATTERNS = [
  "on this page",
  "current page",
  "this page",
  "current site",
  "this site",
  "current website",
  "this website",
  "website in its current format",
  "what do you see",
  "summarize this page",
  "todo list for tasks on this page"
];
const PAGE_LOCAL_AUTH_PATTERN = /\b(log(?:\s|-)?in|sign(?:\s|-)?in|log(?:\s|-)?out|sign(?:\s|-)?out|authenticate)\b/;

export function isPageContextPrompt(prompt) {
  const lower = normalizeText(prompt).toLowerCase();
  if (!lower) {
    return false;
  }

  return PAGE_CONTEXT_PATTERNS.some((pattern) => lower.includes(pattern)) || PAGE_LOCAL_AUTH_PATTERN.test(lower);
}

export function hasAccessibleWebTab(tab) {
  return typeof tab?.id === "number" && /^https?:\/\//i.test(String(tab?.url ?? ""));
}

export function buildActivePagePromptPrefix(tab) {
  if (!hasAccessibleWebTab(tab)) {
    return "";
  }

  const url = normalizeText(tab?.url);
  if (!url) {
    return "";
  }

  const title = normalizeText(tab?.title);
  const lines = ["Current page context:"];
  if (title) {
    lines.push(`- Title: ${JSON.stringify(title)}`);
  }
  lines.push(`- URL: ${url}`);
  lines.push("Use this page as the starting point unless the user asks to navigate elsewhere.");
  return lines.join("\n");
}

export async function getCapturableActiveTab(queryTabs) {
  if (typeof queryTabs !== "function") {
    return null;
  }

  const queryOrder = [
    { active: true, lastFocusedWindow: true, url: WEB_TAB_QUERY },
    { active: true, currentWindow: true, url: WEB_TAB_QUERY },
    { currentWindow: true, url: WEB_TAB_QUERY },
    { lastFocusedWindow: true, url: WEB_TAB_QUERY }
  ];

  for (const queryInfo of queryOrder) {
    try {
      const tabs = await queryTabs(queryInfo);
      const tab = Array.isArray(tabs) ? tabs.find(hasAccessibleWebTab) : null;
      if (tab) {
        return tab;
      }
    } catch {
      // Try the next query shape.
    }
  }

  return null;
}

export function normalizePanelErrorMessage(message) {
  const text = normalizeText(message);
  const lower = text.toLowerCase();
  if (!text) {
    return "Something went wrong.";
  }

  if (lower.includes("cannot access contents of url") || lower.includes("extension manifest must request permission")) {
    return "Atlas cannot use this page. Switch to a normal website tab.";
  }

  if (lower.includes("message port closed before a response was received") || lower.includes("receiving end does not exist")) {
    return "This page stopped responding. Refresh it and try again.";
  }

  if (
    lower.includes("request was aborted") ||
    lower.includes("run aborted") ||
    lower.includes("operation was aborted")
  ) {
    return "The run was interrupted before it finished.";
  }

  return text;
}
