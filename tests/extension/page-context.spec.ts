import { describe, expect, it } from "vitest";

import {
  hasAccessibleWebTab,
  isPageContextPrompt,
  normalizePanelErrorMessage
} from "../../extension/lib/page-context.js";

describe("page context guardrails", () => {
  it("detects prompts that depend on the current page", () => {
    expect(isPageContextPrompt("Create a todo list for tasks on this page")).toBe(true);
    expect(isPageContextPrompt("Summarize the current page")).toBe(true);
    expect(isPageContextPrompt("Looking at the current website of Maranatha College of Wisdom, validate this criticism.")).toBe(true);
    expect(isPageContextPrompt("Tell me whether this website in its current format is acceptable.")).toBe(true);
    expect(isPageContextPrompt("Search the web for Halo Service Desk")).toBe(false);
  });

  it("only treats normal website tabs as accessible page context", () => {
    expect(hasAccessibleWebTab({ id: 1, url: "https://example.com" })).toBe(true);
    expect(hasAccessibleWebTab({ id: 2, url: "http://example.com" })).toBe(true);
    expect(hasAccessibleWebTab({ id: 3, url: "chrome://settings" })).toBe(false);
    expect(hasAccessibleWebTab({ id: 4, url: "" })).toBe(false);
    expect(hasAccessibleWebTab(null)).toBe(false);
  });

  it("normalizes raw Chrome host-permission errors for panel toasts", () => {
    expect(
      normalizePanelErrorMessage('Cannot access contents of url "". Extension manifest must request permission to access this host.')
    ).toBe("Atlas cannot use this page. Switch to a normal website tab.");
    expect(normalizePanelErrorMessage("The message port closed before a response was received.")).toBe(
      "This page stopped responding. Refresh it and try again."
    );
    expect(normalizePanelErrorMessage("Something else failed")).toBe("Something else failed");
  });
});
