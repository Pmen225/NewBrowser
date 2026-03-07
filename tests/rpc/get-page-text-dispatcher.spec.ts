import { describe, expect, it, vi } from "vitest";

import { createGetPageTextDispatcher } from "../../sidecar/src/rpc/get-page-text-dispatcher";

describe("createGetPageTextDispatcher", () => {
  it("returns dialog text instead of evaluating the page when a JavaScript dialog is open", async () => {
    const send = vi.fn();
    const dispatcher = createGetPageTextDispatcher({
      getTab: () => ({
        tabId: "tab-1",
        targetId: "target-1",
        sessionId: "session-1",
        status: "attached",
        attachedAt: "2026-03-06T00:00:00.000Z"
      }),
      getDialogForTab: () => ({
        tabId: "tab-1",
        sessionId: "session-1",
        type: "confirm",
        message: "I am a JS Confirm",
        hasBrowserHandler: true,
        openedAt: "2026-03-06T00:00:00.000Z"
      }),
      send
    });

    await expect(dispatcher.dispatch("GetPageText", "tab-1", {}, new AbortController().signal)).resolves.toMatchObject({
      text: expect.stringContaining("I am a JS Confirm"),
      truncated: false,
      dialog: {
        open: true,
        type: "confirm",
        message: "I am a JS Confirm"
      }
    });
    expect(send).not.toHaveBeenCalled();
  });
});
