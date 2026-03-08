const RECOVERABLE_ERRORS = new Set([
  "ERR_NAME_NOT_RESOLVED",
  "net::ERR_NAME_NOT_RESOLVED"
]);

function isIpv4(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function decodeFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractSearchRecoveryQuery(failedUrl) {
  if (typeof failedUrl !== "string" || failedUrl.trim().length === 0) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(failedUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const hostname = parsed.hostname.trim().replace(/\.+$/, "").toLowerCase();
  if (
    !hostname ||
    hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.startsWith("[") ||
    isIpv4(hostname)
  ) {
    return null;
  }

  const parts = [hostname];
  for (const segment of parsed.pathname.split("/")) {
    const normalized = decodeFragment(segment).trim();
    if (normalized) {
      parts.push(normalized);
    }
  }

  if (parsed.search.length > 1) {
    const query = decodeFragment(parsed.search.slice(1)).replace(/[=&+]/g, " ").trim();
    if (query) {
      parts.push(query);
    }
  }

  if (parsed.hash.length > 1) {
    const hash = decodeFragment(parsed.hash.slice(1)).replace(/[=&+]/g, " ").trim();
    if (hash) {
      parts.push(hash);
    }
  }

  const searchQuery = parts.join(" ").replace(/\s+/g, " ").trim();
  return searchQuery || null;
}

export function resolveOmniboxRecovery({ url, error, frameId = 0 }) {
  if (frameId !== 0 || !RECOVERABLE_ERRORS.has(error)) {
    return null;
  }

  const query = extractSearchRecoveryQuery(url);
  if (!query) {
    return null;
  }

  return {
    query,
    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`
  };
}

export function resolveCompletedTabRecovery({ url, title, status }) {
  if (status !== "complete") {
    return null;
  }

  const query = extractSearchRecoveryQuery(url);
  if (!query) {
    return null;
  }

  const hostname = new URL(url).hostname.trim().replace(/\.+$/, "").toLowerCase();
  const normalizedTitle = typeof title === "string" ? title.trim().toLowerCase() : "";
  if (
    normalizedTitle &&
    normalizedTitle !== hostname &&
    normalizedTitle !== "this site can't be reached" &&
    normalizedTitle !== "this site can’t be reached"
  ) {
    return null;
  }

  return {
    query,
    searchUrl: `https://www.google.com/search?q=${encodeURIComponent(query)}`
  };
}
