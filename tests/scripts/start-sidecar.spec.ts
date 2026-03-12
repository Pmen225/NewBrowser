import { describe, expect, it, vi } from "vitest";

import { maybeOpenAssistantPanel } from "../../scripts/start-sidecar.mjs";

describe("start sidecar launcher", () => {
  it("keeps startup successful when the extension service worker target is missing", async () => {
    const warnings = [];
    const openAssistantSidePanelImpl = vi.fn().mockRejectedValue(new Error("Assistant extension service worker target was not found."));
    const activateChromiumDesktopImpl = vi.fn().mockResolvedValue(undefined);

    await expect(maybeOpenAssistantPanel({
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/test",
      openAssistantSidePanelImpl,
      activateChromiumDesktopImpl,
      warn: (message) => warnings.push(message)
    })).resolves.toBeUndefined();

    expect(openAssistantSidePanelImpl).toHaveBeenCalledWith({
      browserWsUrl: "ws://127.0.0.1:9555/devtools/browser/test"
    });
    expect(activateChromiumDesktopImpl).toHaveBeenCalledTimes(1);
    expect(warnings).toEqual([
      "Assistant side panel auto-open was skipped because the extension service worker target was not found.",
      "The sidecar is running; open the Assistant panel manually once the extension is loaded."
    ]);
  });

  it("rethrows panel auto-open failures that are not the missing service worker case", async () => {
    const activateChromiumDesktopImpl = vi.fn().mockResolvedValue(undefined);

    await expect(maybeOpenAssistantPanel({
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/test",
      openAssistantSidePanelImpl: vi.fn().mockRejectedValue(new Error("boom")),
      activateChromiumDesktopImpl
    })).rejects.toThrow("boom");

    expect(activateChromiumDesktopImpl).not.toHaveBeenCalled();
  });
});
