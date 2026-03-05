import type { JsonObject } from "../../../shared/src/transport";
import { evaluateBlockedNavigation, type BlockedDomainsPolicy } from "./blocked-domains";
import { loadBlockedDomainsPolicyFromSystem } from "./blocked-domains-policy-loader";
import type { ActionReliabilityHooks } from "./reliability";

export type DispatcherReliabilityHooks = Omit<ActionReliabilityHooks, "perform">;

export interface ActionDispatcher {
  dispatch: (action: string, tabId: string, params: JsonObject, signal: AbortSignal) => Promise<JsonObject>;
  supports?: (action: string) => boolean;
  getReliabilityHooks?: (action: string, tabId: string, params: JsonObject) => DispatcherReliabilityHooks | undefined;
}

export interface BlockedDomainsGuardOptions {
  policy?: BlockedDomainsPolicy | (() => BlockedDomainsPolicy);
  systemPolicyLoader?: () => BlockedDomainsPolicy;
  navigationActionName?: string;
}

export interface SafetyPermissionGuardOptions {
  irreversibleActions?: readonly string[];
  intentFieldName?: string;
  confirmedFieldName?: string;
  confirmBeforeFieldName?: string;
  confirmationTokenFieldName?: string;
  confirmationTtlMs?: number;
}

interface DispatcherError extends Error {
  code?: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

function createDispatcherError(
  code: string,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): DispatcherError {
  const error = new Error(message) as DispatcherError;
  error.code = code;
  error.retryable = retryable;
  error.details = details;
  return error;
}

function resolvePolicy(
  input: BlockedDomainsGuardOptions["policy"] | undefined,
  systemPolicyLoader: () => BlockedDomainsPolicy
): BlockedDomainsPolicy {
  if (input === undefined) {
    return systemPolicyLoader();
  }

  if (typeof input === "function") {
    return input();
  }

  return input;
}

function isNavigateToRequest(params: JsonObject): params is JsonObject & { mode: string; url?: unknown } {
  return typeof params.mode === "string" && params.mode === "to";
}

function normalizeGuardToken(value: string): string {
  return value.trim().toLowerCase();
}

function parseIntentList(params: JsonObject, fieldName: string): string[] | null {
  const rawIntent = params[fieldName];
  if (rawIntent === undefined) {
    return null;
  }

  if (typeof rawIntent === "string") {
    const normalized = normalizeGuardToken(rawIntent);
    if (normalized.length === 0) {
      throw createDispatcherError("INVALID_REQUEST", `${fieldName} must be a non-empty string`, false, {
        field: fieldName
      });
    }
    return [normalized];
  }

  if (!Array.isArray(rawIntent)) {
    throw createDispatcherError("INVALID_REQUEST", `${fieldName} must be a string or string[]`, false, {
      field: fieldName
    });
  }

  const parsed: string[] = [];
  for (const value of rawIntent) {
    if (typeof value !== "string") {
      throw createDispatcherError("INVALID_REQUEST", `${fieldName} must only contain strings`, false, {
        field: fieldName
      });
    }

    const normalized = normalizeGuardToken(value);
    if (normalized.length === 0) {
      throw createDispatcherError("INVALID_REQUEST", `${fieldName} must not contain empty values`, false, {
        field: fieldName
      });
    }

    parsed.push(normalized);
  }

  return parsed;
}

function parseBooleanField(params: JsonObject, fieldName: string): boolean | undefined {
  const value = params[fieldName];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw createDispatcherError("INVALID_REQUEST", `${fieldName} must be boolean`, false, {
      field: fieldName
    });
  }

  return value;
}

function parseStringField(params: JsonObject, fieldName: string): string | undefined {
  const value = params[fieldName];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw createDispatcherError("INVALID_REQUEST", `${fieldName} must be a non-empty string`, false, {
      field: fieldName
    });
  }

  return value.trim();
}

function createConfirmationToken(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `confirm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSafetyPermissionGuard(base: ActionDispatcher, options: SafetyPermissionGuardOptions = {}): ActionDispatcher {
  const irreversibleActionSet = new Set(
    (options.irreversibleActions ?? ["submit", "purchase", "delete", "login"])
      .map((value) => normalizeGuardToken(value))
      .filter((value) => value.length > 0)
  );
  const intentFieldName = options.intentFieldName ?? "intent";
  const confirmedFieldName = options.confirmedFieldName ?? "confirmed";
  const confirmBeforeFieldName = options.confirmBeforeFieldName ?? "confirm_before";
  const confirmationTokenFieldName = options.confirmationTokenFieldName ?? "confirmation_token";
  const confirmationTtlMs =
    typeof options.confirmationTtlMs === "number" && Number.isFinite(options.confirmationTtlMs) && options.confirmationTtlMs > 0
      ? Math.floor(options.confirmationTtlMs)
      : 5 * 60_000;
  const pendingConfirmations = new Map<
    string,
    {
      action: string;
      tab_id: string;
      irreversible_action: string;
      expires_at_ms: number;
    }
  >();

  const pruneExpiredConfirmations = (now: number): void => {
    for (const [token, record] of pendingConfirmations.entries()) {
      if (record.expires_at_ms <= now) {
        pendingConfirmations.delete(token);
      }
    }
  };

  const issueConfirmationChallenge = (action: string, tabId: string, irreversibleAction: string, reason?: string): never => {
    const now = Date.now();
    pruneExpiredConfirmations(now);
    const confirmationToken = createConfirmationToken();
    const expiresAtMs = now + confirmationTtlMs;
    pendingConfirmations.set(confirmationToken, {
      action,
      tab_id: tabId,
      irreversible_action: irreversibleAction,
      expires_at_ms: expiresAtMs
    });

    throw createDispatcherError("CONFIRMATION_REQUIRED", "Confirmation required before irreversible action", false, {
      required_confirmation: true,
      confirm_before: true,
      irreversible_action: irreversibleAction,
      action,
      tab_id: tabId,
      confirmation_token: confirmationToken,
      confirmation_expires_at: new Date(expiresAtMs).toISOString(),
      ...(reason ? { reason } : {}),
      message: `Confirm before executing irreversible action: ${irreversibleAction}`
    });
  };

  return {
    supports(action: string): boolean {
      if (!base.supports) {
        return true;
      }
      return base.supports(action);
    },
    async dispatch(action: string, tabId: string, params: JsonObject, signal: AbortSignal): Promise<JsonObject> {
      const intents = parseIntentList(params, intentFieldName);
      if (intents === null) {
        return base.dispatch(action, tabId, params, signal);
      }

      const irreversibleIntent = intents.find((intent) => irreversibleActionSet.has(intent));
      if (!irreversibleIntent) {
        return base.dispatch(action, tabId, params, signal);
      }

      const confirmed = parseBooleanField(params, confirmedFieldName);
      parseBooleanField(params, confirmBeforeFieldName);
      const confirmationToken = parseStringField(params, confirmationTokenFieldName);

      if (confirmed === true && confirmationToken) {
        const now = Date.now();
        pruneExpiredConfirmations(now);

        const approval = pendingConfirmations.get(confirmationToken);
        if (
          approval &&
          approval.expires_at_ms > now &&
          approval.action === action &&
          approval.tab_id === tabId &&
          approval.irreversible_action === irreversibleIntent
        ) {
          pendingConfirmations.delete(confirmationToken);
          return base.dispatch(action, tabId, params, signal);
        }

        return issueConfirmationChallenge(action, tabId, irreversibleIntent, "invalid_or_expired_confirmation");
      }

      return issueConfirmationChallenge(action, tabId, irreversibleIntent);
    },
    getReliabilityHooks(action: string, tabId: string, params: JsonObject): DispatcherReliabilityHooks | undefined {
      return base.getReliabilityHooks?.(action, tabId, params);
    }
  };
}

export function createBlockedDomainsGuard(base: ActionDispatcher, options: BlockedDomainsGuardOptions): ActionDispatcher {
  const navigationActionName = options.navigationActionName ?? "Navigate";
  const systemPolicyLoader = options.systemPolicyLoader ?? (() => loadBlockedDomainsPolicyFromSystem());

  return {
    supports(action: string): boolean {
      if (!base.supports) {
        return true;
      }
      return base.supports(action);
    },
    async dispatch(action: string, tabId: string, params: JsonObject, signal: AbortSignal): Promise<JsonObject> {
      const isNavigationAction = action === navigationActionName || action === "navigate";
      if (isNavigationAction && isNavigateToRequest(params)) {
        if (typeof params.url !== "string" || params.url.trim().length === 0) {
          throw createDispatcherError("INVALID_REQUEST", "Navigate mode=to requires params.url", false, {
            field: "url"
          });
        }

        const decision = evaluateBlockedNavigation(params.url, resolvePolicy(options.policy, systemPolicyLoader));
        if (!decision.allowed) {
          throw createDispatcherError("BLOCKED_DOMAIN", "Navigation blocked by policy", false, {
            normalized_url: decision.normalized_url,
            hostname: decision.hostname,
            matched_rule: decision.matched_rule,
            matched_list: decision.matched_list
          });
        }
      }

      return base.dispatch(action, tabId, params, signal);
    },
    getReliabilityHooks(action: string, tabId: string, params: JsonObject): DispatcherReliabilityHooks | undefined {
      return base.getReliabilityHooks?.(action, tabId, params);
    }
  };
}

export function createPingDispatcher(): ActionDispatcher {
  return {
    supports(action) {
      return action === "ping";
    },
    async dispatch(action, tabId, params) {
      if (action !== "ping") {
        const error = new Error(`Unknown action: ${action}`) as Error & {
          code?: string;
          retryable?: boolean;
        };
        error.code = "UNKNOWN_ACTION";
        error.retryable = false;
        throw error;
      }

      return {
        pong: true,
        tabId,
        echo: params
      };
    }
  };
}

export function createComposedDispatcher(dispatchers: ActionDispatcher[]): ActionDispatcher {
  return {
    supports(action: string): boolean {
      return dispatchers.some((dispatcher) => dispatcher.supports?.(action) ?? false);
    },
    async dispatch(action, tabId, params, signal) {
      for (const dispatcher of dispatchers) {
        if (dispatcher.supports && !dispatcher.supports(action)) {
          continue;
        }
        return dispatcher.dispatch(action, tabId, params, signal);
      }

      const error = new Error(`Unknown action: ${action}`) as Error & {
        code?: string;
        retryable?: boolean;
      };
      error.code = "UNKNOWN_ACTION";
      error.retryable = false;
      throw error;
    },
    getReliabilityHooks(action: string, tabId: string, params: JsonObject): DispatcherReliabilityHooks | undefined {
      for (const dispatcher of dispatchers) {
        if (dispatcher.supports && !dispatcher.supports(action)) {
          continue;
        }

        const hooks = dispatcher.getReliabilityHooks?.(action, tabId, params);
        if (hooks) {
          return hooks;
        }
      }

      return undefined;
    }
  };
}

export { createBrowserActionDispatcher, type BrowserActionDispatcherOptions } from "./browser-action-dispatcher";
export { createReadPageDispatcher, type ReadPageDispatcherOptions } from "./read-page-dispatcher";
export { createActionPolicyGuard } from "../policy/action-policy";
