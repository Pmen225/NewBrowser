import type { JsonObject } from "../../../shared/src/transport";
import type { PromptPolicy } from "../agent/types";
import type { ActionDispatcher } from "../rpc/dispatcher";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStrings(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => flattenStrings(item));
  }

  return [];
}

function isGoogleSearchUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (host === "google.com" || host.endsWith(".google.com")) && url.pathname.toLowerCase() === "/search";
}

function isArchiveHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "archive.today" ||
    host === "archive.is" ||
    host === "archive.ph" ||
    host === "webcache.googleusercontent.com" ||
    host === "web.archive.org"
  );
}

function hasSensitiveQueryParams(url: URL): boolean {
  const sensitiveKeys = new Set([
    "password",
    "pass",
    "passwd",
    "token",
    "key",
    "api_key",
    "authorization",
    "ssn",
    "social_security",
    "passport",
    "credit_card",
    "card",
    "bank_account",
    "routing_number"
  ]);

  for (const key of url.searchParams.keys()) {
    if (sensitiveKeys.has(key.trim().toLowerCase())) {
      return true;
    }
  }

  return false;
}

function isSensitiveBrowserPage(url: URL): boolean {
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "chrome:" && protocol !== "edge:" && protocol !== "brave:") {
    return false;
  }

  const sensitiveHosts = new Set([
    "settings",
    "history",
    "bookmarks",
    "password-manager",
    "passwords",
    "autofill",
    "payments"
  ]);

  return sensitiveHosts.has(url.hostname.toLowerCase());
}

function luhnPasses(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits[index] ?? "", 10);
    if (!Number.isFinite(digit)) {
      return false;
    }

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function containsSensitiveLiteral(value: string): boolean {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("social security") ||
    normalized.includes("passport") ||
    normalized.includes("bank account") ||
    normalized.includes("routing number") ||
    normalized.includes("credit card") ||
    normalized.includes("cvv")
  ) {
    return true;
  }

  if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) {
    return true;
  }

  const cardCandidate = value.replace(/[^0-9]/g, "");
  if (cardCandidate.length >= 13 && cardCandidate.length <= 19 && luhnPasses(cardCandidate)) {
    return true;
  }

  return false;
}

function isHarmfulSearchQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  return (
    normalized.includes("facial images") ||
    normalized.includes("face dataset") ||
    normalized.includes("scrape faces") ||
    normalized.includes("extremist") ||
    normalized.includes("pirated")
  );
}

function block(ruleId: string, message: string, details?: Record<string, unknown>): never {
  throw createDispatcherError("POLICY_BLOCKED", message, false, {
    rule_id: ruleId,
    ...(details ?? {})
  });
}

export function createActionPolicyGuard(
  base: ActionDispatcher,
  options: {
    policy: PromptPolicy;
  }
): ActionDispatcher {
  return {
    supports(action: string): boolean {
      if (!base.supports) {
        return true;
      }
      return base.supports(action);
    },
    async dispatch(action: string, tabId: string, params: JsonObject, signal: AbortSignal): Promise<JsonObject> {
      const normalizedAction = action.trim();
      const policy = options.policy;

      if ((normalizedAction === "Navigate" || normalizedAction === "navigate") && params.mode === "to" && typeof params.url === "string") {
        let parsedUrl: URL | undefined;
        try {
          parsedUrl = new URL(params.url);
        } catch {
          parsedUrl = undefined;
        }

        if (parsedUrl) {
          if (policy.blockGoogleSearchNavigation && isGoogleSearchUrl(parsedUrl)) {
            block("general_search_requires_search_web", "General web search must use search_web, not google.com navigation.", {
              url: parsedUrl.toString()
            });
          }

          if (policy.blockArchiveAccess && isArchiveHost(parsedUrl.hostname)) {
            block("archive_access_blocked", "Archive and cached content access is blocked by policy.", {
              url: parsedUrl.toString()
            });
          }

          if (policy.blockSensitiveBrowserDataAccess && isSensitiveBrowserPage(parsedUrl)) {
            block("sensitive_browser_data_access_blocked", "Access to browser history, settings, bookmarks, passwords, and autofill data is blocked.", {
              url: parsedUrl.toString()
            });
          }

          if (policy.blockSensitiveQueryParams && hasSensitiveQueryParams(parsedUrl)) {
            block("sensitive_query_params_blocked", "Sensitive data must not be sent in URL parameters.", {
              url: parsedUrl.toString()
            });
          }
        }
      }

      if (policy.blockSensitiveIdentityFinancialInput && (normalizedAction === "FormInput" || normalizedAction === "form_input" || normalizedAction === "ComputerBatch" || normalizedAction === "computer")) {
        const sensitiveValue = flattenStrings(params).find((value) => containsSensitiveLiteral(value));
        if (sensitiveValue) {
          block("sensitive_identity_financial_input_blocked", "Sensitive identity and financial data entry is blocked.", {
            sample: sensitiveValue.slice(0, 8)
          });
        }
      }

      if (policy.blockHarmfulSearches && (normalizedAction === "SearchWeb" || normalizedAction === "search_web")) {
        const queries = Array.isArray(params.queries) ? params.queries : [];
        const harmfulQuery = queries.find((query) => typeof query === "string" && isHarmfulSearchQuery(query));
        if (typeof harmfulQuery === "string") {
          block("harmful_search_blocked", "The requested search query is blocked by policy.", {
            query: harmfulQuery
          });
        }
      }

      return base.dispatch(action, tabId, params, signal);
    },
    getReliabilityHooks(action: string, tabId: string, params: JsonObject) {
      return base.getReliabilityHooks?.(action, tabId, params);
    }
  };
}
