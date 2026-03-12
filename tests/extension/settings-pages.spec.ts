import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS_PAGE_ID,
  isDevSettingsPage,
  resolveSettingsPageId
} from "../../extension/lib/settings-pages.js";

describe("settings page resolution", () => {
  it("defaults unknown pages to general", () => {
    expect(resolveSettingsPageId("")).toBe(DEFAULT_SETTINGS_PAGE_ID);
    expect(resolveSettingsPageId("unknown-page")).toBe(DEFAULT_SETTINGS_PAGE_ID);
  });

  it("maps legacy aliases onto the reorganised settings pages", () => {
    expect(resolveSettingsPageId("provider")).toBe("general-providers");
    expect(resolveSettingsPageId("models")).toBe("general-models");
    expect(resolveSettingsPageId("data")).toBe("data-controls");
    expect(resolveSettingsPageId("chats")).toBe("data-controls-chats");
    expect(resolveSettingsPageId("commands", { developerModeEnabled: true })).toBe("agent-mode-commands");
    expect(resolveSettingsPageId("advanced", { developerModeEnabled: true })).toBe("agent-mode-runtime");
    expect(resolveSettingsPageId("agent", { developerModeEnabled: true })).toBe("dev");
  });

  it("treats the dev root and its detail pages as developer-only", () => {
    expect(isDevSettingsPage("dev")).toBe(true);
    expect(isDevSettingsPage("agent-mode-runtime")).toBe(true);
    expect(isDevSettingsPage("agent-mode-commands")).toBe(true);
    expect(isDevSettingsPage("general")).toBe(false);
  });

  it("falls back to general when developer mode is disabled", () => {
    expect(resolveSettingsPageId("dev")).toBe(DEFAULT_SETTINGS_PAGE_ID);
    expect(resolveSettingsPageId("agent-mode-runtime")).toBe(DEFAULT_SETTINGS_PAGE_ID);
    expect(resolveSettingsPageId("agent-mode-commands")).toBe(DEFAULT_SETTINGS_PAGE_ID);
  });
});
