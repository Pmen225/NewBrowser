import { describe, expect, it, vi } from "vitest";

import type { JsonObject } from "../../../shared/src/transport";
import {
  ReliabilityError,
  executeWithReliability,
  type ActionReliabilityHooks,
  type ReliabilityPolicy,
  type ReliabilityRuntime
} from "../../../sidecar/src/rpc/reliability";

function retryableError(code: string, message: string): Error & { code: string; retryable: boolean } {
  const error = new Error(message) as Error & { code: string; retryable: boolean };
  error.code = code;
  error.retryable = true;
  return error;
}

function nonRetryableError(code: string, message: string): Error & { code: string; retryable: boolean } {
  const error = new Error(message) as Error & { code: string; retryable: boolean };
  error.code = code;
  error.retryable = false;
  return error;
}

function deterministicRuntime(): ReliabilityRuntime {
  let now = 0;

  return {
    now: () => now,
    sleep: async (ms: number, signal: AbortSignal) => {
      if (signal.aborted) {
        return;
      }
      now += ms;
    }
  };
}

describe("executeWithReliability", () => {
  it("retries transient failures and supports reread-page param recompute", async () => {
    let calls = 0;
    const seenParams: JsonObject[] = [];

    const hooks: ActionReliabilityHooks = {
      perform: async ({ params }) => {
        calls += 1;
        seenParams.push(params);

        if (calls < 2) {
          throw retryableError("STALE_ELEMENT", "element moved");
        }

        return {
          done: true,
          call_count: calls
        };
      },
      rereadPage: async () => ({
        ref_id: "f0:200"
      })
    };

    const result = await executeWithReliability({
      action: "click",
      tab_id: "tab-1",
      params: {
        ref_id: "f0:100"
      },
      signal: new AbortController().signal,
      hooks,
      runtime: deterministicRuntime()
    });

    expect(result.result).toMatchObject({
      done: true,
      call_count: 2
    });
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]).toMatchObject({
      attempt: 1,
      ok: false,
      retryable: true,
      reason_code: "STALE_ELEMENT"
    });
    expect(result.attempts[1]).toMatchObject({
      attempt: 2,
      ok: true
    });

    expect(seenParams).toEqual([
      { ref_id: "f0:100" },
      { ref_id: "f0:200" }
    ]);
  });

  it("does not retry non-retryable errors", async () => {
    let calls = 0;

    const hooks: ActionReliabilityHooks = {
      perform: async () => {
        calls += 1;
        throw nonRetryableError("INVALID_ACTION_INPUT", "bad params");
      }
    };

    await expect(
      executeWithReliability({
        action: "type",
        tab_id: "tab-1",
        params: {},
        signal: new AbortController().signal,
        hooks,
        runtime: deterministicRuntime()
      })
    ).rejects.toMatchObject({
      code: "INVALID_ACTION_INPUT",
      retryable: false
    });

    expect(calls).toBe(1);
  });

  it("retries wait timeout and returns explicit non-retryable exhausted code", async () => {
    let calls = 0;

    const hooks: ActionReliabilityHooks = {
      perform: async () => {
        calls += 1;
        return { ok: true };
      },
      waitFor: async () => [
        {
          kind: "navigation",
          expected_url: "https://example.com/next"
        }
      ],
      waitForNavigation: async () => false
    };

    const policy: Partial<ReliabilityPolicy> = {
      max_attempts: 3,
      wait_timeout_ms: 30,
      selector_poll_ms: 10
    };

    await expect(
      executeWithReliability({
        action: "navigate",
        tab_id: "tab-1",
        params: {},
        signal: new AbortController().signal,
        hooks,
        policy,
        runtime: deterministicRuntime()
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT_EXHAUSTED",
      retryable: false
    });

    expect(calls).toBe(3);
  });

  it("stops retries when the request is aborted", async () => {
    let calls = 0;
    const controller = new AbortController();

    const hooks: ActionReliabilityHooks = {
      perform: async () => {
        calls += 1;
        throw retryableError("FRAME_STALE", "retry me");
      },
      rereadPage: async () => {
        controller.abort();
      }
    };

    await expect(
      executeWithReliability({
        action: "click",
        tab_id: "tab-1",
        params: {},
        signal: controller.signal,
        hooks,
        runtime: deterministicRuntime()
      })
    ).rejects.toMatchObject({
      code: "REQUEST_ABORTED",
      retryable: true
    });

    expect(calls).toBe(1);
  });

  it("bounds network-idle waits and exhausts with explicit code", async () => {
    const hooks: ActionReliabilityHooks = {
      perform: async () => ({ ok: true }),
      waitFor: async () => [{ kind: "network_idle", quiet_ms: 20 }],
      getInflightRequestCount: async () => 1
    };

    await expect(
      executeWithReliability({
        action: "click",
        tab_id: "tab-1",
        params: {},
        signal: new AbortController().signal,
        hooks,
        policy: {
          max_attempts: 1,
          wait_timeout_ms: 50,
          selector_poll_ms: 10
        },
        runtime: deterministicRuntime()
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT_EXHAUSTED",
      retryable: false
    });
  });

  it("exposes ReliabilityError for typed error handling", () => {
    const error = new ReliabilityError("X", "Y", true, {
      hint: "z"
    });

    expect(error).toMatchObject({
      code: "X",
      message: "Y",
      retryable: true,
      details: {
        hint: "z"
      }
    });
  });

  it("supports default runtime with Vitest fake timers", async () => {
    vi.useFakeTimers();

    try {
      const promise = executeWithReliability({
        action: "navigate",
        tab_id: "tab-1",
        params: {},
        signal: new AbortController().signal,
        hooks: {
          perform: async () => ({ ok: true }),
          waitFor: async () => [
            {
              kind: "navigation",
              expected_url: "https://example.com/next"
            }
          ],
          waitForNavigation: async () => false
        },
        policy: {
          max_attempts: 1,
          wait_timeout_ms: 40,
          selector_poll_ms: 10
        }
      });
      const rejection = expect(promise).rejects.toMatchObject({
        code: "WAIT_TIMEOUT_EXHAUSTED",
        retryable: false
      });

      await vi.advanceTimersByTimeAsync(200);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
