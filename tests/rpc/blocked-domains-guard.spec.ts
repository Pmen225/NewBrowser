import { describe, expect, it, vi } from "vitest";

import type { JsonObject } from "../../shared/src/transport";
import { createBlockedDomainsGuard, type ActionDispatcher } from "../../sidecar/src/rpc/dispatcher";

function createBaseDispatcher() {
  const dispatch = vi.fn(async (_action: string, _tabId: string, params: JsonObject) => ({
    forwarded: true,
    echo: params
  }));

  const base: ActionDispatcher = {
    supports(action) {
      return action === "Navigate" || action === "ComputerBatch";
    },
    dispatch
  };

  return {
    base,
    dispatch
  };
}

describe("blocked domains guard", () => {
  it("blocks Navigate mode=to requests before base dispatcher", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      policy: {
        blocklist: ["*"]
      }
    });

    await expect(
      guarded.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to",
          url: "https://blocked.example"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "BLOCKED_DOMAIN",
      retryable: false,
      details: {
        matched_rule: "*",
        matched_list: "blocklist"
      }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("forwards allowed Navigate mode=to requests exactly once", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      policy: {
        blocklist: ["*"],
        allowlist: ["example.com"]
      }
    });

    const result = await guarded.dispatch(
      "Navigate",
      "tab-1",
      {
        mode: "to",
        url: "https://example.com/ok"
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      forwarded: true
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("bypasses policy checks for non-navigation actions", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      policy: {
        blocklist: ["*"]
      }
    });

    const result = await guarded.dispatch(
      "ComputerBatch",
      "tab-1",
      {
        steps: []
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      forwarded: true
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("requires url for Navigate mode=to and reports INVALID_REQUEST", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      policy: {
        blocklist: ["*"]
      }
    });

    await expect(
      guarded.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retryable: false,
      details: { field: "url" }
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  it("does not require url for non-to navigate modes", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      policy: {
        blocklist: ["*"]
      }
    });

    const result = await guarded.dispatch(
      "Navigate",
      "tab-1",
      {
        mode: "back"
      },
      new AbortController().signal
    );

    expect(result).toMatchObject({
      forwarded: true
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("uses system policy loader when policy option is omitted", async () => {
    const { base, dispatch } = createBaseDispatcher();
    const guarded = createBlockedDomainsGuard(base, {
      systemPolicyLoader: () => ({
        blocklist: ["*"]
      })
    });

    await expect(
      guarded.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to",
          url: "https://blocked.example"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "BLOCKED_DOMAIN",
      retryable: false
    });

    expect(dispatch).toHaveBeenCalledTimes(0);
  });
});
