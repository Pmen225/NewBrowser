import type { JsonObject } from "../../../shared/src/transport";

export interface ReliabilityPolicy {
  max_attempts: number;
  wait_timeout_ms: number;
  network_idle_quiet_ms: number;
  selector_poll_ms: number;
}

export type WaitDirective =
  | {
      kind: "navigation";
      expected_url?: string;
    }
  | {
      kind: "selector";
      ref_id?: string;
      name?: string;
    }
  | {
      kind: "network_idle";
      quiet_ms: number;
    };

export interface WaitResult {
  kind: WaitDirective["kind"];
  ok: boolean;
  duration_ms: number;
  error_code?: string;
  error_message?: string;
}

export interface AttemptOutcome {
  attempt: number;
  ok: boolean;
  retryable: boolean;
  reason_code?: string;
  reason_message?: string;
  wait_results: WaitResult[];
}

export interface ReliabilityRuntime {
  now: () => number;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
}

export interface AttemptContext {
  action: string;
  tab_id: string;
  params: JsonObject;
  attempt: number;
  signal: AbortSignal;
  policy: ReliabilityPolicy;
}

export interface WaitContext extends AttemptContext {
  result: JsonObject;
}

export interface FailedAttemptContext extends AttemptContext {
  error: ReliabilityError;
}

export interface ActionReliabilityHooks {
  beforeAttempt?: (ctx: AttemptContext) => Promise<void>;
  perform: (ctx: AttemptContext) => Promise<JsonObject>;
  waitFor?: (ctx: WaitContext) => Promise<WaitDirective[]>;
  verifyEffect?: (ctx: WaitContext) => Promise<boolean>;
  rereadPage?: (ctx: FailedAttemptContext) => Promise<JsonObject | void>;
  waitForNavigation?: (expectedUrl?: string) => Promise<boolean>;
  waitForSelector?: (query: { ref_id?: string; name?: string }) => Promise<boolean>;
  getInflightRequestCount?: () => Promise<number>;
}

export interface ExecuteWithReliabilityInput {
  action: string;
  tab_id: string;
  params: JsonObject;
  signal: AbortSignal;
  hooks: ActionReliabilityHooks;
  policy?: Partial<ReliabilityPolicy>;
  runtime?: ReliabilityRuntime;
}

export interface ExecuteWithReliabilityResult {
  result: JsonObject;
  attempts: AttemptOutcome[];
}

const DEFAULT_POLICY: ReliabilityPolicy = {
  max_attempts: 3,
  wait_timeout_ms: 2_000,
  network_idle_quiet_ms: 500,
  selector_poll_ms: 100
};

const DEFAULT_RUNTIME: ReliabilityRuntime = {
  now: () => Date.now(),
  sleep: (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        cleanup();
        resolve();
      };

      const cleanup = () => {
        signal.removeEventListener("abort", onAbort);
      };

      signal.addEventListener("abort", onAbort, { once: true });
    })
};

export class ReliabilityError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;

  constructor(code: string, message: string, retryable: boolean, details?: JsonObject) {
    super(message);
    this.name = "ReliabilityError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

function normalizeReliabilityError(error: unknown): ReliabilityError {
  if (error instanceof ReliabilityError) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
      details?: unknown;
    };

    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      const details =
        candidate.details && typeof candidate.details === "object" && !Array.isArray(candidate.details)
          ? (candidate.details as JsonObject)
          : undefined;
      return new ReliabilityError(candidate.code, candidate.message, candidate.retryable === true, details);
    }

    if (typeof candidate.message === "string") {
      return new ReliabilityError("INTERNAL_ERROR", candidate.message, false);
    }
  }

  return new ReliabilityError("INTERNAL_ERROR", "Unexpected reliability failure", false);
}

function resolvePolicy(policy?: Partial<ReliabilityPolicy>): ReliabilityPolicy {
  return {
    max_attempts:
      typeof policy?.max_attempts === "number" && Number.isFinite(policy.max_attempts) && policy.max_attempts > 0
        ? Math.floor(policy.max_attempts)
        : DEFAULT_POLICY.max_attempts,
    wait_timeout_ms:
      typeof policy?.wait_timeout_ms === "number" && Number.isFinite(policy.wait_timeout_ms) && policy.wait_timeout_ms >= 0
        ? Math.floor(policy.wait_timeout_ms)
        : DEFAULT_POLICY.wait_timeout_ms,
    network_idle_quiet_ms:
      typeof policy?.network_idle_quiet_ms === "number" &&
      Number.isFinite(policy.network_idle_quiet_ms) &&
      policy.network_idle_quiet_ms >= 0
        ? Math.floor(policy.network_idle_quiet_ms)
        : DEFAULT_POLICY.network_idle_quiet_ms,
    selector_poll_ms:
      typeof policy?.selector_poll_ms === "number" && Number.isFinite(policy.selector_poll_ms) && policy.selector_poll_ms > 0
        ? Math.floor(policy.selector_poll_ms)
        : DEFAULT_POLICY.selector_poll_ms
  };
}

function ensureNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new ReliabilityError("REQUEST_ABORTED", "Request was aborted", true);
  }
}

async function waitForNavigation(
  hooks: ActionReliabilityHooks,
  expectedUrl: string | undefined,
  timeoutMs: number,
  pollMs: number,
  signal: AbortSignal,
  runtime: ReliabilityRuntime
): Promise<WaitResult> {
  if (!hooks.waitForNavigation) {
    return {
      kind: "navigation",
      ok: false,
      duration_ms: 0,
      error_code: "WAIT_PROBE_MISSING",
      error_message: "Missing waitForNavigation probe"
    };
  }

  const started = runtime.now();

  while (runtime.now() - started <= timeoutMs) {
    ensureNotAborted(signal);
    if (await hooks.waitForNavigation(expectedUrl)) {
      return {
        kind: "navigation",
        ok: true,
        duration_ms: runtime.now() - started
      };
    }

    await runtime.sleep(pollMs, signal);
  }

  return {
    kind: "navigation",
    ok: false,
    duration_ms: runtime.now() - started,
    error_code: "WAIT_TIMEOUT",
    error_message: "Timed out waiting for navigation"
  };
}

async function waitForSelector(
  hooks: ActionReliabilityHooks,
  directive: { ref_id?: string; name?: string },
  timeoutMs: number,
  pollMs: number,
  signal: AbortSignal,
  runtime: ReliabilityRuntime
): Promise<WaitResult> {
  if (!directive.ref_id && !directive.name) {
    return {
      kind: "selector",
      ok: false,
      duration_ms: 0,
      error_code: "WAIT_SELECTOR_INVALID",
      error_message: "Selector wait requires ref_id or name"
    };
  }

  if (!hooks.waitForSelector) {
    return {
      kind: "selector",
      ok: false,
      duration_ms: 0,
      error_code: "WAIT_PROBE_MISSING",
      error_message: "Missing waitForSelector probe"
    };
  }

  const started = runtime.now();

  while (runtime.now() - started <= timeoutMs) {
    ensureNotAborted(signal);
    if (await hooks.waitForSelector(directive)) {
      return {
        kind: "selector",
        ok: true,
        duration_ms: runtime.now() - started
      };
    }

    await runtime.sleep(pollMs, signal);
  }

  return {
    kind: "selector",
    ok: false,
    duration_ms: runtime.now() - started,
    error_code: "WAIT_TIMEOUT",
    error_message: "Timed out waiting for selector"
  };
}

async function waitForNetworkIdle(
  hooks: ActionReliabilityHooks,
  quietMs: number,
  timeoutMs: number,
  pollMs: number,
  signal: AbortSignal,
  runtime: ReliabilityRuntime
): Promise<WaitResult> {
  if (!hooks.getInflightRequestCount) {
    return {
      kind: "network_idle",
      ok: false,
      duration_ms: 0,
      error_code: "WAIT_PROBE_MISSING",
      error_message: "Missing getInflightRequestCount probe"
    };
  }

  const started = runtime.now();
  let idleSince: number | null = null;

  while (runtime.now() - started <= timeoutMs) {
    ensureNotAborted(signal);

    const inFlight = await hooks.getInflightRequestCount();
    if (inFlight <= 0) {
      if (idleSince === null) {
        idleSince = runtime.now();
      }

      if (runtime.now() - idleSince >= quietMs) {
        return {
          kind: "network_idle",
          ok: true,
          duration_ms: runtime.now() - started
        };
      }
    } else {
      idleSince = null;
    }

    await runtime.sleep(pollMs, signal);
  }

  return {
    kind: "network_idle",
    ok: false,
    duration_ms: runtime.now() - started,
    error_code: "WAIT_TIMEOUT",
    error_message: "Timed out waiting for network idle"
  };
}

async function runWaitDirectives(
  directives: WaitDirective[],
  hooks: ActionReliabilityHooks,
  policy: ReliabilityPolicy,
  signal: AbortSignal,
  runtime: ReliabilityRuntime
): Promise<WaitResult[]> {
  const results: WaitResult[] = [];

  for (const directive of directives) {
    let result: WaitResult;

    if (directive.kind === "navigation") {
      result = await waitForNavigation(
        hooks,
        directive.expected_url,
        policy.wait_timeout_ms,
        policy.selector_poll_ms,
        signal,
        runtime
      );
    } else if (directive.kind === "selector") {
      result = await waitForSelector(
        hooks,
        {
          ref_id: directive.ref_id,
          name: directive.name
        },
        policy.wait_timeout_ms,
        policy.selector_poll_ms,
        signal,
        runtime
      );
    } else {
      result = await waitForNetworkIdle(
        hooks,
        directive.quiet_ms,
        policy.wait_timeout_ms,
        policy.selector_poll_ms,
        signal,
        runtime
      );
    }

    results.push(result);
    if (!result.ok) {
      break;
    }
  }

  return results;
}

function toFinalExhaustedError(lastError: ReliabilityError, attempt: number, outcomes: AttemptOutcome[]): ReliabilityError {
  const baseCode = lastError.code;
  const code = baseCode === "WAIT_TIMEOUT" ? "WAIT_TIMEOUT_EXHAUSTED" : `${baseCode}_EXHAUSTED`;

  return new ReliabilityError(code, `Action failed after ${attempt} attempts`, false, {
    last_error_code: lastError.code,
    last_error_message: lastError.message,
    attempts: outcomes.length
  });
}

export async function executeWithReliability(input: ExecuteWithReliabilityInput): Promise<ExecuteWithReliabilityResult> {
  const policy = resolvePolicy(input.policy);
  const runtime = input.runtime ?? DEFAULT_RUNTIME;
  const attempts: AttemptOutcome[] = [];

  let currentParams = input.params;

  for (let attempt = 1; attempt <= policy.max_attempts; attempt += 1) {
    ensureNotAborted(input.signal);

    const attemptContext: AttemptContext = {
      action: input.action,
      tab_id: input.tab_id,
      params: currentParams,
      attempt,
      signal: input.signal,
      policy
    };

    let attemptWaitResults: WaitResult[] = [];

    try {
      await input.hooks.beforeAttempt?.(attemptContext);
      ensureNotAborted(input.signal);

      const result = await input.hooks.perform(attemptContext);
      ensureNotAborted(input.signal);

      const directives = (await input.hooks.waitFor?.({ ...attemptContext, result })) ?? [];
      const waitResults = await runWaitDirectives(directives, input.hooks, policy, input.signal, runtime);
      attemptWaitResults = waitResults;

      const failedWait = waitResults.find((entry) => !entry.ok);
      if (failedWait) {
        throw new ReliabilityError(
          failedWait.error_code ?? "WAIT_FAILED",
          failedWait.error_message ?? "Wait directive failed",
          failedWait.error_code === "WAIT_PROBE_MISSING" || failedWait.error_code === "WAIT_SELECTOR_INVALID" ? false : true,
          {
            wait_kind: failedWait.kind,
            duration_ms: failedWait.duration_ms
          }
        );
      }

      if (input.hooks.verifyEffect) {
        const effectOk = await input.hooks.verifyEffect({ ...attemptContext, result });
        if (!effectOk) {
          throw new ReliabilityError("ACTION_NO_EFFECT", "Action completed without observable effect", true);
        }
      }

      attempts.push({
        attempt,
        ok: true,
        retryable: false,
        wait_results: waitResults
      });

      return {
        result,
        attempts
      };
    } catch (error) {
      const normalized = normalizeReliabilityError(error);

      attempts.push({
        attempt,
        ok: false,
        retryable: normalized.retryable,
        reason_code: normalized.code,
        reason_message: normalized.message,
        wait_results: attemptWaitResults
      });

      if (normalized.code === "REQUEST_ABORTED") {
        throw normalized;
      }

      if (input.signal.aborted) {
        throw new ReliabilityError("REQUEST_ABORTED", "Request was aborted", true, {
          last_error_code: normalized.code
        });
      }

      const canRetry = normalized.retryable && attempt < policy.max_attempts;
      if (!canRetry) {
        if (normalized.retryable && attempt >= policy.max_attempts) {
          throw toFinalExhaustedError(normalized, attempt, attempts);
        }

        throw normalized;
      }

      const recomputedParams = await input.hooks.rereadPage?.({
        ...attemptContext,
        error: normalized
      });

      if (recomputedParams && typeof recomputedParams === "object" && !Array.isArray(recomputedParams)) {
        currentParams = recomputedParams;
      }
    }
  }

  throw new ReliabilityError("INTERNAL_ERROR", "Reliability loop exited unexpectedly", false);
}
