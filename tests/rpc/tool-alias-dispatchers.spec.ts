import { describe, expect, it, vi } from "vitest";

import { createFindDispatcher } from "../../sidecar/src/rpc/find-dispatcher";
import { createGetPageTextDispatcher } from "../../sidecar/src/rpc/get-page-text-dispatcher";

describe("tool alias dispatchers", () => {
  it("find dispatcher supports canonical and alias names", () => {
    const dispatcher = createFindDispatcher({
      getClientForTab: () => undefined
    });

    expect(dispatcher.supports?.("find")).toBe(true);
    expect(dispatcher.supports?.("Find")).toBe(true);
  });

  it("get_page_text dispatcher supports alias and dispatches with alias", async () => {
    const send = vi.fn(async () => ({
      result: {
        value: "Page text content"
      }
    }));
    const dispatcher = createGetPageTextDispatcher({
      getTab: () => ({
        tabId: "tab-1",
        targetId: "target-1",
        sessionId: "session-1",
        status: "attached",
        attachedAt: "2026-03-01T00:00:00.000Z"
      }),
      send
    });

    expect(dispatcher.supports?.("get_page_text")).toBe(true);
    expect(dispatcher.supports?.("GetPageText")).toBe(true);

    await expect(
      dispatcher.dispatch("GetPageText", "tab-1", {}, new AbortController().signal)
    ).resolves.toEqual({
      text: "Page text content",
      truncated: false
    });
  });

  it("get_page_text falls back to dispatcher tab when params.tab_id is stale", async () => {
    const send = vi.fn(async () => ({
      result: {
        value: "Recovered page text"
      }
    }));
    const dispatcher = createGetPageTextDispatcher({
      getTab: (tabId) =>
        tabId === "tab-1"
          ? {
              tabId: "tab-1",
              targetId: "target-1",
              sessionId: "session-1",
              status: "attached",
              attachedAt: "2026-03-01T00:00:00.000Z"
            }
          : undefined,
      send
    });

    await expect(
      dispatcher.dispatch(
        "get_page_text",
        "tab-1",
        {
          tab_id: "stale-target-id"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      text: "Recovered page text",
      truncated: false
    });
  });
});
