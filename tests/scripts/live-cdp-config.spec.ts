import { describe, expect, it } from "vitest";

import {
  assertSelectedModelConfig,
  normalizeGoogleModelId,
  resolveLiveModelSelection
} from "../../scripts/lib/live-cdp-config.js";

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
});
