import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it, vi } from "vitest";

import { createProviderStateService } from "../../sidecar/src/llm/provider-state";

describe("provider state service", () => {
  it("persists provider defaults and syncs a cached provider catalog", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "atlas-provider-state-"));
    const cachePath = join(cacheDir, "provider-state.json");
    const registry = {
      validate: vi.fn(),
      listModels: vi.fn(async () => ({
        provider: "google" as const,
        models: ["models/gemini-2.5-flash", "models/gemini-2.5-pro"],
        default_model: "models/gemini-2.5-flash"
      })),
      buildExecutionConfig: vi.fn((_provider, preferences) => ({
        provider: "google" as const,
        model: preferences.selected_model,
        request_shape: {
          config: {
            thinkingConfig: {
              thinkingLevel: "HIGH"
            },
            safetySettings: ["low"]
          }
        }
      }))
    };

    const service = createProviderStateService({
      providerRegistry: registry,
      cachePath
    });

    const defaults = await service.setDefaults({
      provider: "google",
      selected_model: "models/gemini-2.5-pro",
      thinking_level: "high",
      low_safety: true,
      enable_function_calling: true,
      enable_code_execution: true
    });

    expect(defaults.provider).toBe("google");
    expect(defaults.execution?.request_shape).toMatchObject({
      config: {
        thinkingConfig: {
          thinkingLevel: "HIGH"
        },
        safetySettings: ["low"]
      }
    });

    const catalog = await service.syncCatalog({
      provider: "google",
      api_key: "google-key"
    });

    expect(catalog.sync_status).toBe("ok");
    expect(catalog.models).toHaveLength(2);
    expect(catalog.models[0]).toMatchObject({
      provider: "google",
      id: "models/gemini-2.5-flash",
      supports_function_calling: true
    });

    const saved = JSON.parse(await readFile(cachePath, "utf8")) as {
      defaults: unknown[];
      catalogs: unknown[];
    };
    expect(saved.defaults).toHaveLength(1);
    expect(saved.catalogs).toHaveLength(1);

    const reloaded = createProviderStateService({
      providerRegistry: registry,
      cachePath
    });

    const reloadedDefaults = await reloaded.getDefaults("google");
    const reloadedCatalog = await reloaded.getCatalog("google");

    expect(reloadedDefaults).toMatchObject({
      provider: "google",
      selected_model: "models/gemini-2.5-pro"
    });
    expect(reloadedCatalog).toMatchObject({
      provider: "google",
      sync_status: "ok"
    });
  });

  it("primes the startup cache from environment-backed provider credentials", async () => {
    const registry = {
      validate: vi.fn(),
      listModels: vi.fn(async ({ provider }: { provider: string }) => ({
        provider,
        models: provider === "openai" ? ["gpt-5.2"] : ["models/gemini-2.5-flash"],
        default_model: provider === "openai" ? "gpt-5.2" : "models/gemini-2.5-flash"
      })),
      buildExecutionConfig: vi.fn((provider, preferences) => ({
        provider,
        model: preferences.selected_model,
        request_shape: {}
      }))
    };

    const service = createProviderStateService({
      providerRegistry: registry,
      env: {
        OPENAI_API_KEY: "sk-openai",
        GEMINI_API_KEY: "sk-gemini"
      }
    });

    await service.primeFromEnvironment();

    expect(registry.listModels).toHaveBeenCalledTimes(2);
    const openaiCatalog = await service.getCatalog("openai");
    const googleCatalog = await service.getCatalog("google");
    expect(openaiCatalog?.sync_status).toBe("ok");
    expect(googleCatalog?.sync_status).toBe("ok");
  });
});
