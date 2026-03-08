function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function isPageContextPrompt(prompt) {
  const lower = normalizeText(prompt).toLowerCase();
  if (!lower) {
    return false;
  }

  return (
    lower.includes("on this page") ||
    lower.includes("current page") ||
    lower.includes("this page") ||
    lower.includes("current site") ||
    lower.includes("this site") ||
    lower.includes("current website") ||
    lower.includes("this website") ||
    lower.includes("website in its current format") ||
    lower.includes("what do you see") ||
    lower.includes("summarize this page") ||
    lower.includes("todo list for tasks on this page")
  );
}

export function hasAccessibleWebTab(tab) {
  return typeof tab?.id === "number" && /^https?:\/\//i.test(String(tab?.url ?? ""));
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

  return text;
}
