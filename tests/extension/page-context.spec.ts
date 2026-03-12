import { describe, expect, it } from "vitest";

import {
  buildActivePagePromptPrefix,
  getCapturableActiveTab,
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
    expect(
      isPageContextPrompt("Log in using username tomsmith and password SuperSecretPassword!, then tell me the success message.")
    ).toBe(true);
    expect(isPageContextPrompt("Sign in with the saved credentials and tell me whether it worked.")).toBe(true);
    expect(isPageContextPrompt("Search the web for Halo Service Desk")).toBe(false);
  });

  it("builds a stable prompt prefix for the active page", () => {
    expect(buildActivePagePromptPrefix({
      id: 7,
      title: "The Internet",
      url: "https://the-internet.herokuapp.com/login"
    })).toBe(
      [
        "Current page context:",
        '- Title: "The Internet"',
        "- URL: https://the-internet.herokuapp.com/login",
        "Use this page as the starting point unless the user asks to navigate elsewhere."
      ].join("\n")
    );
  });

  it("omits page context for inaccessible or empty tabs", () => {
    expect(buildActivePagePromptPrefix({ id: 9, title: "Settings", url: "chrome://settings" })).toBe("");
    expect(buildActivePagePromptPrefix({ id: 10, title: "", url: "" })).toBe("");
  });

  it("only treats normal website tabs as accessible page context", () => {
    expect(hasAccessibleWebTab({ id: 1, url: "https://example.com" })).toBe(true);
    expect(hasAccessibleWebTab({ id: 2, url: "http://example.com" })).toBe(true);
    expect(hasAccessibleWebTab({ id: 3, url: "chrome://settings" })).toBe(false);
    expect(hasAccessibleWebTab({ id: 4, url: "" })).toBe(false);
    expect(hasAccessibleWebTab(null)).toBe(false);
  });

  it("finds a capturable active web tab from the focused browser window first", async () => {
    const queries = [];
    const tab = await getCapturableActiveTab(async (queryInfo) => {
      queries.push(queryInfo);
      if (queryInfo.active && queryInfo.lastFocusedWindow) {
        return [{ id: 7, windowId: 12, url: "https://example.com/dashboard" }];
      }
      return [];
    });

    expect(tab).toEqual({ id: 7, windowId: 12, url: "https://example.com/dashboard" });
    expect(queries[0]).toMatchObject({
      active: true,
      lastFocusedWindow: true
    });
  });

  it("falls back to the current window when the focused-window query has no capturable web tab", async () => {
    const tab = await getCapturableActiveTab(async (queryInfo) => {
      if (queryInfo.active && queryInfo.lastFocusedWindow) {
        return [{ id: 1, windowId: 3, url: "chrome://settings" }];
      }
      if (queryInfo.active && queryInfo.currentWindow) {
        return [{ id: 9, windowId: 4, url: "https://example.com" }];
      }
      return [];
    });

    expect(tab).toEqual({ id: 9, windowId: 4, url: "https://example.com" });
  });

  it("returns null when no capturable website tab exists", async () => {
    const tab = await getCapturableActiveTab(async () => [{ id: 2, windowId: 5, url: "chrome://extensions" }]);
    expect(tab).toBeNull();
  });

  it("normalizes raw Chrome host-permission errors for panel toasts", () => {
    expect(
      normalizePanelErrorMessage('Cannot access contents of url "". Extension manifest must request permission to access this host.')
    ).toBe("Atlas cannot use this page. Switch to a normal website tab.");
    expect(normalizePanelErrorMessage("The message port closed before a response was received.")).toBe(
      "This page stopped responding. Refresh it and try again."
    );
    expect(normalizePanelErrorMessage("Request was aborted")).toBe(
      "The run was interrupted before it finished."
    );
    expect(normalizePanelErrorMessage("Something else failed")).toBe("Something else failed");
  });
});
