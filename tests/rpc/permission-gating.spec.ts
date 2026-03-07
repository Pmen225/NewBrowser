import { describe, expect, it, vi } from "vitest";

import type { JsonObject } from "../../shared/src/transport";
import {
  createSafetyPermissionGuard,
  type ActionDispatcher,
  type DispatcherReliabilityHooks
} from "../../sidecar/src/rpc/dispatcher";

function createBaseDispatcher() {
  const dispatch = vi.fn(async (_action: string, _tabId: string, params: JsonObject) => ({
    forwarded: true,
    echo: params
  }));
  const hooks: DispatcherReliabilityHooks = {};
  const getReliabilityHooks = vi.fn(() => hooks);

  const base: ActionDispatcher = {
    supports(action) {
      return action === "Navigate" || action === "ComputerBatch";
    },
    dispatch,
    getReliabilityHooks
  };

  return {
    base,
    dispatch,
    hooks,
    getReliabilityHooks
  };
}

describe("safety permission guard", () => {
  it("blocks irreversible intent without confirmation and emits challenge token", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "submit"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      retryable: false,
      details: {
        required_confirmation: true,
        confirm_before: true,
        irreversible_action: "submit",
        action: "ComputerBatch",
        tab_id: "tab-1",
        confirmation_token: expect.any(String)
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("blocks irreversible intent arrays without confirmation", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "Navigate",
        "tab-2",
        {
          intent: ["read", "purchase"]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      retryable: false,
      details: {
        irreversible_action: "purchase"
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("does not allow confirmed=true without a valid confirmation token", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "delete",
          confirmed: true
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      retryable: false
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("does not allow confirm_before=false to bypass confirmation", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "login",
          confirm_before: false
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      retryable: false
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("allows irreversible intent after valid challenge response and consumes token", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    let challengeError: { details?: Record<string, unknown> } | undefined;
    try {
      await guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "purchase"
        },
        new AbortController().signal
      );
    } catch (error) {
      challengeError = error as { details?: Record<string, unknown> };
    }

    const token = challengeError?.details?.confirmation_token;
    expect(typeof token).toBe("string");

    const firstApproval = await guarded.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        intent: "purchase",
        confirmed: true,
        confirmation_token: token as string
      },
      new AbortController().signal
    );

    expect(firstApproval).toMatchObject({
      forwarded: true
    });

    expect(dispatch).toHaveBeenCalledTimes(1);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "purchase",
          confirmed: true,
          confirmation_token: token as string
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "CONFIRMATION_REQUIRED",
      retryable: false
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("forwards requests when intent is absent and ignores malformed confirmation fields", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    const result = await guarded.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        steps: [],
        confirmed: "not-boolean",
        confirmation_token: 42
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      forwarded: true
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("returns INVALID_REQUEST for malformed intent", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: 42
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      details: {
        field: "intent"
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("returns INVALID_REQUEST for malformed confirmed flag", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "submit",
          confirmed: "yes"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      details: {
        field: "confirmed"
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("returns INVALID_REQUEST for malformed confirmation token on irreversible actions", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    await expect(
      guarded.dispatch(
        "ComputerBatch",
        "tab-1",
        {
          intent: "submit",
          confirmed: true,
          confirmation_token: 42
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      details: {
        field: "confirmation_token"
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("passes through supports() and reliability hooks()", () => {
    const { base, hooks, getReliabilityHooks } = createBaseDispatcher();
    const guarded = createSafetyPermissionGuard(base);

    expect(guarded.supports?.("Navigate")).toBe(true);
    expect(guarded.supports?.("ping")).toBe(false);
    expect(guarded.getReliabilityHooks?.("Navigate", "tab-1", {})).toBe(hooks);
    expect(getReliabilityHooks).toHaveBeenCalledWith("Navigate", "tab-1", {});
  });
});
