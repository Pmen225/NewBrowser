import { describe, expect, it, vi } from "vitest";

import { createBlockedDomainsGuard } from "../../sidecar/src/rpc/dispatcher";

describe("blocked domains guard", () => {
  it("still blocks chrome pages by default", async () => {
    const guard = createBlockedDomainsGuard(
      {
        supports: () => true,
        dispatch: vi.fn(async () => ({ ok: true }))
      },
      {}
    );

    await expect(
      guard.dispatch("navigate", "tab-1", { mode: "to", url: "chrome://settings" }, new AbortController().signal)
    ).rejects.toMatchObject({
      code: "BLOCKED_DOMAIN"
    });
  });

  it("allows explicit sensitive browser pages when the request marks them as intentional", async () => {
    const baseDispatch = vi.fn(async () => ({ ok: true }));
    const guard = createBlockedDomainsGuard(
      {
        supports: () => true,
        dispatch: baseDispatch
      },
      {}
    );

    await expect(
      guard.dispatch(
        "navigate",
        "tab-1",
        { mode: "to", url: "chrome://flags", allow_sensitive_browser_pages: true },
        new AbortController().signal
      )
    ).resolves.toEqual({ ok: true });
    expect(baseDispatch).toHaveBeenCalledTimes(1);
  });
});
