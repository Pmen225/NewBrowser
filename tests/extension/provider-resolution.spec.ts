import { describe, expect, it } from "vitest";

import { resolveProviderSelection, buildMissingProviderSessionMessage } from "../../extension/lib/provider-resolution.js";

describe("provider resolution", () => {
  it("does not silently fall back to a different unlocked provider in manual mode", () => {
    const resolved = resolveProviderSelection({
      config: {
        defaultModelMode: "manual",
        selectedProvider: "google",
        selectedModelId: "models/gemini-2.5-flash"
      },
      sessions: [
        {
          provider: "deepseek",
          apiKey: "deepseek-key",
          baseUrl: "",
          preferredModel: "deepseek-chat"
        }
      ]
    });

    expect(resolved.provider).toBe("google");
    expect(resolved.model).toBe("models/gemini-2.5-flash");
    expect(resolved.apiKey).toBe("");
    expect(resolved.baseUrl).toBeUndefined();
    expect(resolved.missingProviderSession).toBe(true);
  });

  it("keeps auto model selection aligned with an unlocked provider session", () => {
    const resolved = resolveProviderSelection({
      config: {
        defaultModelMode: "auto",
        selectedProvider: "auto",
        selectedModelId: "auto",
        thinkingLevel: "high"
      },
      catalog: [
        {
          provider: "google",
          id: "models/gemini-2.5-flash",
          enabled: true,
          inputModalities: ["text", "vision"],
          supportsFunctionCalling: true,
          supportsCodeExecution: true,
          supportsBrowserSearch: true,
          maxThinkingLevel: "high",
          costTier: "low",
          capabilityTier: "balanced",
          inputPricePerMToken: 0.3,
          outputPricePerMToken: 2.5
        },
        {
          provider: "deepseek",
          id: "deepseek-chat",
          enabled: true,
          inputModalities: ["text"],
          supportsFunctionCalling: true,
          supportsCodeExecution: false,
          supportsBrowserSearch: false,
          maxThinkingLevel: "high",
          costTier: "lowest",
          capabilityTier: "balanced",
          inputPricePerMToken: 0.27,
          outputPricePerMToken: 1.1
        }
      ],
      sessions: [
        {
          provider: "google",
          apiKey: "google-key",
          baseUrl: "",
          preferredModel: "models/gemini-2.5-flash"
        }
      ],
      taskRequest: {
        requiresBrowserControl: true,
        requiresFunctionCalling: true,
        requiresCodeExecution: true
      }
    });

    expect(resolved.provider).toBe("google");
    expect(resolved.model).toBe("models/gemini-2.5-flash");
    expect(resolved.apiKey).toBe("google-key");
    expect(resolved.missingProviderSession).toBe(false);
  });

  it("uses the unlocked provider session when auto mode has no catalog yet", () => {
    const resolved = resolveProviderSelection({
      config: {
        defaultModelMode: "auto",
        selectedProvider: "auto",
        selectedModelId: "auto",
        thinkingLevel: "high"
      },
      catalog: [],
      sessions: [
        {
          provider: "openai",
          apiKey: "openai-key",
          baseUrl: "",
          preferredModel: "gpt-4.1-mini"
        }
      ],
      taskRequest: {
        requiresFunctionCalling: false,
        requiresCodeExecution: false,
        requiresBrowserControl: false
      }
    });

    expect(resolved.provider).toBe("openai");
    expect(resolved.model).toBe("gpt-4.1-mini");
    expect(resolved.apiKey).toBe("openai-key");
    expect(resolved.missingProviderSession).toBe(false);
  });

  it("treats gemini sessions as google for legacy saved provider keys", () => {
    const resolved = resolveProviderSelection({
      config: {
        defaultModelMode: "manual",
        selectedProvider: "google",
        selectedModelId: "models/gemini-2.5-flash"
      },
      sessions: [
        {
          provider: "gemini",
          apiKey: "google-key",
          baseUrl: "",
          preferredModel: "models/gemini-2.5-flash"
        }
      ]
    });

    expect(resolved.provider).toBe("google");
    expect(resolved.model).toBe("models/gemini-2.5-flash");
    expect(resolved.apiKey).toBe("google-key");
    expect(resolved.missingProviderSession).toBe(false);
  });

  it("builds a direct missing-session error message", () => {
    expect(buildMissingProviderSessionMessage("google")).toBe("Google is selected, but Google is not ready in Settings yet.");
    expect(buildMissingProviderSessionMessage("deepseek")).toBe("DeepSeek is selected, but DeepSeek is not ready in Settings yet.");
  });
});
