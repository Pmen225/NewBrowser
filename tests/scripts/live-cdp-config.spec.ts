import { describe, expect, it } from "vitest";

import {
  assertSelectedModelConfig,
  normalizeGoogleModelId,
  resolveLiveModelSelection
} from "../../scripts/lib/live-cdp-config.js";
import {
  parseRemoteDebuggingPort
} from "../../scripts/lib/cdp-discovery.js";

describe("live CDP config", () => {
  it("defaults live panel checks to manual gemini-2.5-flash instead of auto mode", () => {
    expect(resolveLiveModelSelection()).toEqual({
      modelId: "models/gemini-2.5-flash",
      mode: "manual"
    });
  });

  it("normalizes explicit manual model selections", () => {
    expect(resolveLiveModelSelection({
      requestedModelId: "gemini-3-flash-preview"
    })).toEqual({
      modelId: "models/gemini-3-flash-preview",
      mode: "manual"
    });
  });

  it("preserves explicit non-google manual model selections", () => {
    expect(resolveLiveModelSelection({
      provider: "openai",
      requestedModelId: "gpt-4o-mini"
    })).toEqual({
      modelId: "gpt-4o-mini",
      mode: "manual"
    });
  });

  it("rejects panel model configs that remain in auto or on the wrong model", () => {
    expect(() => assertSelectedModelConfig(
      {
        defaultModelMode: "auto",
        selectedProvider: "google",
        selectedModelId: "auto"
      },
      {
        provider: "google",
        mode: "manual",
        modelId: normalizeGoogleModelId("gemini-2.5-flash")
      }
    )).toThrow(/Expected manual model mode/i);

    expect(() => assertSelectedModelConfig(
      {
        defaultModelMode: "manual",
        selectedProvider: "google",
        selectedModelId: "models/gemini-2.5-flash-lite"
      },
      {
        provider: "google",
        mode: "manual",
        modelId: normalizeGoogleModelId("gemini-2.5-flash")
      }
    )).toThrow(/Expected selected model/i);
  });

  it("extracts a running Chromium remote debugging port for the shared profile", () => {
    expect(parseRemoteDebuggingPort(
      "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium --remote-debugging-port=50388 --user-data-dir=/tmp/profile about:blank",
      { profileRoot: "/tmp/profile" }
    )).toBe(50388);

    expect(parseRemoteDebuggingPort(
      "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium --remote-debugging-port=50388 --user-data-dir=/tmp/other-profile about:blank",
      { profileRoot: "/tmp/profile" }
    )).toBeNull();
  });
});
