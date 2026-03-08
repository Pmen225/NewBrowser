import { describe, expect, it } from "vitest";

import { resolveTranscriptionConfig, resolveTranscriptionModelForProvider, listTranscriptionModelsForProvider } from "../../extension/lib/transcription-config.js";

describe("transcription config", () => {
  it("uses a transcription-safe OpenAI default when auto is selected", () => {
    expect(resolveTranscriptionModelForProvider("openai", "auto")).toBe("gpt-4o-mini-transcribe");
    expect(resolveTranscriptionModelForProvider("openai", "gpt-5.2")).toBe("gpt-4o-mini-transcribe");
  });

  it("keeps a valid Google transcription model when one is already configured", () => {
    expect(resolveTranscriptionModelForProvider("google", "models/gemini-2.5-flash")).toBe("models/gemini-2.5-flash");
  });

  it("lists provider-aware OpenAI transcription options", () => {
    expect(listTranscriptionModelsForProvider("openai", [
      { provider: "openai", id: "gpt-4o-transcribe", displayName: "GPT-4o transcribe" },
      { provider: "openai", id: "gpt-5.2", displayName: "GPT-5.2" }
    ])).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "gpt-4o-mini-transcribe" }),
      expect.objectContaining({ id: "gpt-4o-transcribe" }),
      expect.objectContaining({ id: "whisper-1" })
    ]));
  });

  it("keeps the selected provider when its key is missing instead of silently hopping to another provider", () => {
    const resolved = resolveTranscriptionConfig({
      panelSettings: {
        transcriptionEnabled: true,
        transcriptionModelId: "auto",
        transcriptionLanguage: "en-GB"
      },
      modelConfig: {
        defaultModelMode: "manual",
        selectedProvider: "google",
        selectedModelId: "models/gemini-2.5-flash"
      },
      catalog: [],
      sessions: [
        {
          provider: "openai",
          apiKey: "openai-key",
          preferredModel: "gpt-4.1-mini"
        }
      ]
    });

    expect(resolved.provider).toBe("google");
    expect(resolved.missingProviderSession).toBe(true);
    expect(resolved.status).toBe("missing_provider_session");
    expect(resolved.apiKey).toBe("");
  });

  it("allows an explicit transcription provider override that reuses that provider session", () => {
    const resolved = resolveTranscriptionConfig({
      panelSettings: {
        transcriptionEnabled: true,
        transcriptionProvider: "openai",
        transcriptionModelId: "gpt-4o-transcribe"
      },
      modelConfig: {
        defaultModelMode: "manual",
        selectedProvider: "google",
        selectedModelId: "models/gemini-2.5-flash"
      },
      catalog: [],
      sessions: [
        {
          provider: "openai",
          apiKey: "openai-key",
          preferredModel: "gpt-4.1-mini"
        },
        {
          provider: "google",
          apiKey: "google-key",
          preferredModel: "models/gemini-2.5-flash"
        }
      ]
    });

    expect(resolved.provider).toBe("openai");
    expect(resolved.providerMode).toBe("explicit");
    expect(resolved.apiKey).toBe("openai-key");
    expect(resolved.resolvedModelId).toBe("gpt-4o-transcribe");
  });

  it("includes manually added compatible models in transcription options for the chosen provider", () => {
    const options = listTranscriptionModelsForProvider("openai", [
      { provider: "openai", id: "gpt-4o-transcribe", displayName: "GPT-4o transcribe" },
      { provider: "openai", id: "gpt-4o-mini-transcribe", displayName: "GPT-4o mini transcribe" },
      { provider: "openai", id: "whisper-1", displayName: "Whisper-1" },
      { provider: "openai", id: "gpt-4o-transcribe-custom", displayName: "Team Transcribe", enabled: true }
    ], "gpt-4o-transcribe-custom");

    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "gpt-4o-transcribe-custom", label: "gpt-4o-transcribe-custom" })
    ]));
  });

  it("surfaces unsupported providers cleanly", () => {
    const resolved = resolveTranscriptionConfig({
      panelSettings: {
        transcriptionEnabled: true,
        transcriptionModelId: "auto"
      },
      modelConfig: {
        defaultModelMode: "manual",
        selectedProvider: "anthropic",
        selectedModelId: "claude-sonnet-4"
      },
      catalog: [],
      sessions: [
        {
          provider: "anthropic",
          apiKey: "anthropic-key",
          preferredModel: "claude-sonnet-4"
        }
      ]
    });

    expect(resolved.provider).toBe("anthropic");
    expect(resolved.supported).toBe(false);
    expect(resolved.status).toBe("unsupported_provider");
    expect(resolved.availableModels).toEqual([]);
  });
});
