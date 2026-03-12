import { describe, expect, it } from "vitest";

import { normalizeModelConfig } from "../../extension/lib/model-config.js";
import {
  getDefaultWebBrowsingSettings,
  readWebBrowsingSettings,
  resetWebBrowsingModelConfig
} from "../../extension/lib/web-browsing-settings.js";

describe("web browsing settings", () => {
  it("derives defaults from the authoritative model config defaults", () => {
    expect(getDefaultWebBrowsingSettings()).toEqual({
      allowBrowserSearch: true
    });
  });

  it("reads the current web browsing settings from model config", () => {
    expect(readWebBrowsingSettings(normalizeModelConfig({
      allowBrowserSearch: false,
      enableFunctionCalling: true
    }))).toEqual({
      allowBrowserSearch: false
    });
  });

  it("resets only the web browsing slice and preserves unrelated model settings", () => {
    expect(resetWebBrowsingModelConfig(normalizeModelConfig({
      defaultModelMode: "manual",
      selectedProvider: "google",
      selectedModelId: "models/gemini-2.5-pro",
      thinkingLevel: "medium",
      enableFunctionCalling: false,
      enableCodeExecution: false,
      allowVision: false,
      allowBrowserSearch: false
    }))).toEqual(expect.objectContaining({
      defaultModelMode: "manual",
      selectedProvider: "google",
      selectedModelId: "models/gemini-2.5-pro",
      thinkingLevel: "medium",
      enableFunctionCalling: false,
      enableCodeExecution: false,
      allowVision: false,
      allowBrowserSearch: true
    }));
  });
});
