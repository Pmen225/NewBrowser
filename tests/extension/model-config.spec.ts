import { describe, expect, it, vi } from "vitest";

import {
  GOOGLE_BROWSER_BENCHMARK_MODEL_IDS,
  GOOGLE_REMOVED_MODEL_IDS,
  GOOGLE_VISIBLE_MODEL_IDS,
  buildTaskCapabilityRequest,
  chooseAutoModel,
  chooseBrowserControlBenchmarkWinner,
  createCatalogEntry,
  getModelBenchmarkEntry,
  isBrowserControlBenchmarkCandidate,
  normalizeModelConfig,
  normalizeModelCatalog,
  normalizeModelBenchmarkManifest,
  recordModelBenchmarkResult,
  syncModelCatalogs
} from "../../extension/lib/model-config.js";

describe("extension model config", () => {
  it("chooses the cheapest eligible model and preserves high thinking when supported", () => {
    const catalog = [
      createCatalogEntry("google", "models/gemini-2.5-pro", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true,
        maxThinkingLevel: "high",
        costTier: "high",
        capabilityTier: "advanced"
      }),
      createCatalogEntry("google", "models/gemini-2.5-flash", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: false,
        supportsBrowserSearch: true,
        maxThinkingLevel: "medium",
        costTier: "low",
        capabilityTier: "balanced"
      }),
      createCatalogEntry("openai", "gpt-4.1-mini", {
        inputModalities: ["text"],
        supportsFunctionCalling: true,
        supportsCodeExecution: false,
        supportsBrowserSearch: true,
        maxThinkingLevel: "high",
        costTier: "lowest",
        capabilityTier: "balanced"
      })
    ];

    const config = normalizeModelConfig({
      defaultModelMode: "auto",
      thinkingLevel: "high"
    });

    const result = chooseAutoModel(catalog, {
      requiresVision: true,
      requiresFunctionCalling: true,
      requiresCodeExecution: false,
      requiresBrowserSearch: true
    }, config);

    expect(result).toEqual(expect.objectContaining({
      chosenProvider: "google",
      chosenModelId: "models/gemini-2.5-flash",
      thinkingLevel: "medium"
    }));
    expect(result.reason).toContain("lowest-cost");
  });

  it("syncs provider models and preserves manual entries", async () => {
    const existingCatalog = [
      createCatalogEntry("google", "models/gemini-manual", {
        source: "manual",
        inputModalities: ["text", "vision"]
      })
    ];

    const listModels = vi.fn(async () => ({
      models: ["models/gemini-2.5-flash", "models/gemini-2.5-pro"],
      default_model: "models/gemini-2.5-flash"
    }));

    const result = await syncModelCatalogs({
      existingCatalog,
      unlockedProviders: [
        {
          provider: "google",
          apiKey: "google-key",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta"
        }
      ],
      listModels,
      now: "2026-03-02T13:00:00.000Z"
    });

    expect(listModels).toHaveBeenCalledTimes(1);
    expect(result.catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({
        provider: "google",
        id: "models/gemini-manual",
        source: "manual"
      }),
      expect.objectContaining({
        provider: "google",
        id: "models/gemini-2.5-flash",
        source: "provider_sync"
      })
    ]));
    expect(result.results).toEqual([
      expect.objectContaining({
        provider: "google",
        ok: true
      })
    ]);
  });

  it("canonicalizes Google model IDs to models/* and deduplicates raw aliases", () => {
    const catalog = normalizeModelCatalog([
      { provider: "google", id: "gemini-flash-latest" },
      { provider: "google", id: "models/gemini-flash-latest" },
      { provider: "openai", id: "gpt-4.1-mini" }
    ]);

    expect(catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({
        provider: "google",
        id: "models/gemini-flash-latest"
      }),
      expect.objectContaining({
        provider: "openai",
        id: "gpt-4.1-mini"
      })
    ]));
    expect(catalog.filter((entry) => entry.provider === "google")).toHaveLength(1);
  });

  it("classifies new Gemini flash-lite, latest, and image models for browser-control QA", () => {
    const flashLite = createCatalogEntry("google", "gemini-2.5-flash-lite");
    const flashLatest = createCatalogEntry("google", "gemini-flash-latest");
    const image = createCatalogEntry("google", "gemini-2.5-flash-image");

    expect(flashLite).toEqual(expect.objectContaining({
      id: "models/gemini-2.5-flash-lite",
      costTier: "lowest",
      supportsFunctionCalling: true
    }));
    expect(flashLatest).toEqual(expect.objectContaining({
      id: "models/gemini-flash-latest",
      costTier: "low"
    }));
    expect(image).toEqual(expect.objectContaining({
      id: "models/gemini-2.5-flash-image",
      supportsFunctionCalling: false,
      supportsBrowserSearch: false
    }));
  });

  it("keeps image generation entries visible while excluding them from browser-control benchmarks", () => {
    const visibleCatalog = GOOGLE_VISIBLE_MODEL_IDS.map((id) => createCatalogEntry("google", id));

    expect(visibleCatalog.map((entry) => entry.id)).toEqual(expect.arrayContaining(GOOGLE_VISIBLE_MODEL_IDS));
    expect(visibleCatalog.filter(isBrowserControlBenchmarkCandidate).map((entry) => entry.id)).toEqual(
      GOOGLE_BROWSER_BENCHMARK_MODEL_IDS
    );
    expect(GOOGLE_BROWSER_BENCHMARK_MODEL_IDS).not.toContain("models/gemini-2.5-flash-image");
  });

  it("removes disqualified flash-lite and preview variants from the visible Google catalog", () => {
    expect(GOOGLE_VISIBLE_MODEL_IDS).not.toEqual(expect.arrayContaining(GOOGLE_REMOVED_MODEL_IDS));
    expect(GOOGLE_BROWSER_BENCHMARK_MODEL_IDS).not.toEqual(expect.arrayContaining(GOOGLE_REMOVED_MODEL_IDS));
  });

  it("drops removed Google models from normalized catalogs and sanitizes stale config", () => {
    const catalog = normalizeModelCatalog([
      { provider: "google", id: "models/gemini-3-flash-preview" },
      { provider: "google", id: "models/gemini-2.5-flash" }
    ]);

    expect(catalog.map((entry) => entry.id)).toEqual(["models/gemini-2.5-flash"]);

    const config = normalizeModelConfig({
      defaultModelMode: "manual",
      selectedProvider: "google",
      selectedModelId: "models/gemini-3.1-flash-lite-preview"
    });

    expect(config.selectedModelId).toBe("models/gemini-2.5-flash");
  });

  it("recommends the cheapest model among the top browser-control performers", () => {
    const result = chooseBrowserControlBenchmarkWinner([
      {
        modelId: "models/gemini-2.5-flash",
        costTier: "low",
        passCount: 6,
        totalCount: 6,
        hardFailureCount: 0,
        medianElapsedMs: 11_000
      },
      {
        modelId: "models/gemini-flash-latest",
        costTier: "low",
        passCount: 6,
        totalCount: 6,
        hardFailureCount: 0,
        medianElapsedMs: 10_000
      },
      {
        modelId: "models/gemini-3-pro-preview",
        costTier: "high",
        passCount: 6,
        totalCount: 6,
        hardFailureCount: 0,
        medianElapsedMs: 9_000
      }
    ]);

    expect(result).toEqual(expect.objectContaining({
      recommendedModelId: "models/gemini-flash-latest",
      keptSafeDefault: false
    }));
    expect(result.disqualifiedModelIds).toEqual([]);
  });

  it("keeps the safe default when cheaper aliases are less reliable or hard-fail live validation", () => {
    const result = chooseBrowserControlBenchmarkWinner([
      {
        modelId: "models/gemini-2.5-flash",
        costTier: "low",
        passCount: 6,
        totalCount: 6,
        hardFailureCount: 0,
        medianElapsedMs: 11_000
      },
      {
        modelId: "models/gemini-flash-latest",
        costTier: "low",
        passCount: 0,
        totalCount: 1,
        hardFailureCount: 1,
        medianElapsedMs: 1_500
      }
    ]);

    expect(result).toEqual(expect.objectContaining({
      recommendedModelId: "models/gemini-2.5-flash",
      keptSafeDefault: true
    }));
    expect(result.disqualifiedModelIds).toContain("models/gemini-flash-latest");
  });

  it("infers browser-control capability needs from current-page action prompts", () => {
    expect(buildTaskCapabilityRequest({
      prompt: "On this page, select Option 2 and tell me which option is selected."
    })).toEqual(expect.objectContaining({
      requiresBrowserControl: true,
      requiresFunctionCalling: true,
      requiresBrowserSearch: false
    }));

    expect(buildTaskCapabilityRequest({
      prompt: "Tell me the heading on this page."
    })).toEqual(expect.objectContaining({
      requiresBrowserControl: false,
      requiresFunctionCalling: false
    }));

    expect(buildTaskCapabilityRequest({
      prompt: "Log in using username tomsmith and password SuperSecretPassword!, then tell me the success message."
    })).toEqual(expect.objectContaining({
      requiresBrowserControl: true,
      requiresFunctionCalling: true,
      requiresBrowserSearch: false
    }));
  });

  it("prefers the benchmark-proven Google model for browser-control auto selection", () => {
    const catalog = [
      createCatalogEntry("google", "models/gemini-2.5-flash", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      }),
      createCatalogEntry("google", "models/gemini-3-flash-preview", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      })
    ];

    const config = normalizeModelConfig({
      defaultModelMode: "auto",
      selectedProvider: "google",
      thinkingLevel: "high"
    });

    const result = chooseAutoModel(catalog, {
      requiresBrowserControl: true,
      requiresFunctionCalling: true
    }, config);

    expect(result).toEqual(expect.objectContaining({
      chosenProvider: "google",
      chosenModelId: "models/gemini-2.5-flash"
    }));
    expect(result.reason).toContain("browser-control");
  });

  it("still prefers the cheapest Google model when the task does not require browser control", () => {
    const catalog = [
      createCatalogEntry("google", "models/gemini-2.5-flash", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      }),
      createCatalogEntry("google", "models/gemini-flash-latest", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      })
    ];

    const config = normalizeModelConfig({
      defaultModelMode: "auto",
      selectedProvider: "google",
      thinkingLevel: "medium"
    });

    const result = chooseAutoModel(catalog, {
      requiresFunctionCalling: false,
      requiresBrowserControl: false
    }, config);

    expect(result).toEqual(expect.objectContaining({
      chosenProvider: "google",
      chosenModelId: "models/gemini-2.5-flash"
    }));
  });

  it("records approved and blocked benchmark verdicts with normalized model ids", () => {
    const approvedManifest = recordModelBenchmarkResult(undefined, {
      provider: "google",
      modelId: "gemini-flash-latest",
      generatedAt: "2026-03-06T12:00:00.000Z",
      benchmarkKind: "gemini-browser-control-course",
      outputDir: "/tmp/flash-latest",
      summaryPath: "/tmp/flash-latest/summary.json",
      passCount: 6,
      totalCount: 6,
      hardFailureCount: 0,
      medianElapsedMs: 12_000,
      failureModes: []
    });

    expect(getModelBenchmarkEntry(approvedManifest, "google", "models/gemini-flash-latest")).toEqual(
      expect.objectContaining({
        provider: "google",
        modelId: "models/gemini-flash-latest",
        status: "approved",
        benchmark: expect.objectContaining({
          passCount: 6,
          totalCount: 6,
          hardFailureCount: 0
        })
      })
    );

    const blockedManifest = recordModelBenchmarkResult(approvedManifest, {
      provider: "google",
      modelId: "gemini-3.1-flash",
      generatedAt: "2026-03-06T13:00:00.000Z",
      benchmarkKind: "gemini-browser-control-course",
      outputDir: "/tmp/gemini-3.1-flash",
      summaryPath: "/tmp/gemini-3.1-flash/summary.json",
      passCount: 1,
      totalCount: 6,
      hardFailureCount: 3,
      medianElapsedMs: 20_000,
      failureModes: ["provider_http_error", "timeout"]
    });

    expect(getModelBenchmarkEntry(blockedManifest, "google", "models/gemini-3.1-flash")).toEqual(
      expect.objectContaining({
        status: "blocked",
        benchmark: expect.objectContaining({
          failureModes: ["provider_http_error", "timeout"]
        })
      })
    );
  });

  it("normalizes malformed benchmark manifests into a stable empty structure", () => {
    expect(normalizeModelBenchmarkManifest(null)).toEqual({
      version: 1,
      entries: []
    });
  });

  it("uses approved benchmark results for browser-control auto selection before fallback ranking", () => {
    const catalog = [
      createCatalogEntry("google", "models/gemini-2.5-flash", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      }),
      createCatalogEntry("google", "models/gemini-flash-latest", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      })
    ];

    const manifest = recordModelBenchmarkResult(undefined, {
      provider: "google",
      modelId: "models/gemini-flash-latest",
      generatedAt: "2026-03-06T14:00:00.000Z",
      benchmarkKind: "gemini-browser-control-course",
      outputDir: "/tmp/gemini-flash-latest",
      summaryPath: "/tmp/gemini-flash-latest/summary.json",
      passCount: 6,
      totalCount: 6,
      hardFailureCount: 0,
      medianElapsedMs: 10_000,
      failureModes: []
    });

    const config = normalizeModelConfig({
      defaultModelMode: "auto",
      selectedProvider: "google",
      thinkingLevel: "high"
    });

    const result = chooseAutoModel(catalog, {
      requiresBrowserControl: true,
      requiresFunctionCalling: true
    }, config, manifest);

    expect(result).toEqual(expect.objectContaining({
      chosenProvider: "google",
      chosenModelId: "models/gemini-flash-latest"
    }));
    expect(result.reason).toContain("approved");
  });

  it("excludes blocked benchmark models from browser-control auto selection", () => {
    const catalog = [
      createCatalogEntry("google", "models/gemini-2.5-flash", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      }),
      createCatalogEntry("google", "models/gemini-flash-latest", {
        inputModalities: ["text", "vision"],
        supportsFunctionCalling: true,
        supportsCodeExecution: true,
        supportsBrowserSearch: true
      })
    ];

    const manifest = recordModelBenchmarkResult(undefined, {
      provider: "google",
      modelId: "models/gemini-flash-latest",
      generatedAt: "2026-03-06T14:30:00.000Z",
      benchmarkKind: "gemini-browser-control-course",
      outputDir: "/tmp/gemini-flash-latest",
      summaryPath: "/tmp/gemini-flash-latest/summary.json",
      passCount: 0,
      totalCount: 6,
      hardFailureCount: 4,
      medianElapsedMs: 5_000,
      failureModes: ["provider_http_error"]
    });

    const config = normalizeModelConfig({
      defaultModelMode: "auto",
      selectedProvider: "google",
      thinkingLevel: "high"
    });

    const result = chooseAutoModel(catalog, {
      requiresBrowserControl: true,
      requiresFunctionCalling: true
    }, config, manifest);

    expect(result).toEqual(expect.objectContaining({
      chosenProvider: "google",
      chosenModelId: "models/gemini-2.5-flash"
    }));
  });
});
