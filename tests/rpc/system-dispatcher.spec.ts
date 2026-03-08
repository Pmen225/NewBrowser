import { describe, expect, it, vi } from "vitest";

import { createSystemDispatcher } from "../../sidecar/src/rpc/system-dispatcher";

describe("system dispatcher", () => {
  it("supports runtime and provider actions", () => {
    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "openai" as const, models: ["gpt-4.1-mini"] }))
      }
    });

    expect(dispatcher.supports?.("GetRuntimeState")).toBe(true);
    expect(dispatcher.supports?.("ProviderValidate")).toBe(true);
    expect(dispatcher.supports?.("ProviderListModels")).toBe(true);
    expect(dispatcher.supports?.("ProviderDefaultsGet")).toBe(true);
    expect(dispatcher.supports?.("ProviderDefaultsPut")).toBe(true);
    expect(dispatcher.supports?.("ProviderCatalogGet")).toBe(true);
    expect(dispatcher.supports?.("ProviderCatalogSync")).toBe(true);
    expect(dispatcher.supports?.("ProviderBenchmarkBrowserControl")).toBe(true);
    expect(dispatcher.supports?.("ProviderTranscribeAudio")).toBe(true);
    expect(dispatcher.supports?.("AgentSteer")).toBe(true);
    expect(dispatcher.supports?.("Navigate")).toBe(false);
  });

  it("returns runtime state", async () => {
    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "cdp",
        default_tab_id: "tab-1",
        active_tab_id: "tab-1",
        tabs: [{ tab_id: "tab-1", target_id: "target-1" }],
        browser_policy: "ungoogled_only",
        extension_loaded: true
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "openai" as const, models: ["gpt-4.1-mini"] }))
      }
    });

    const result = await dispatcher.dispatch("GetRuntimeState", "__system__", {}, new AbortController().signal);
    expect(result).toEqual({
      mode: "cdp",
      default_tab_id: "tab-1",
      active_tab_id: "tab-1",
      tabs: [{ tab_id: "tab-1", target_id: "target-1" }],
      browser_policy: "ungoogled_only",
      extension_loaded: true
    });
  });

  it("rejects malformed provider validate params", async () => {
    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "openai" as const, models: ["gpt-4.1-mini"] }))
      }
    });

    await expect(
      dispatcher.dispatch(
        "ProviderValidate",
        "__system__",
        {
          provider: "openai"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });
  });

  it("delegates provider actions to registry", async () => {
    const registry = {
      validate: vi.fn(async () => ({ provider: "anthropic" as const, ok: false, error_code: "PROVIDER_AUTH_FAILED" })),
      listModels: vi.fn(async () => ({ provider: "google" as const, models: ["models/gemini-1.5-pro"], default_model: "models/gemini-1.5-pro" })),
      transcribeAudio: vi.fn(async () => ({ provider: "google" as const, model_id: "models/gemini-2.5-flash", text: "hello world" }))
    };

    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: registry
    });

    const validateResult = await dispatcher.dispatch(
      "ProviderValidate",
      "__system__",
      {
        provider: "anthropic",
        api_key: "sk-ant-test"
      },
      new AbortController().signal
    );

    expect(validateResult).toEqual({
      provider: "anthropic",
      ok: false,
      error_code: "PROVIDER_AUTH_FAILED"
    });

    const modelsResult = await dispatcher.dispatch(
      "ProviderListModels",
      "__system__",
      {
        provider: "google",
        api_key: "g-test"
      },
      new AbortController().signal
    );

    expect(modelsResult).toEqual({
      provider: "google",
      models: ["models/gemini-1.5-pro"],
      default_model: "models/gemini-1.5-pro"
    });
    expect(registry.validate).toHaveBeenCalledTimes(1);
    expect(registry.listModels).toHaveBeenCalledTimes(1);

    const transcriptionResult = await dispatcher.dispatch(
      "ProviderTranscribeAudio",
      "__system__",
      {
        provider: "google",
        model_id: "models/gemini-2.5-flash",
        api_key: "g-test",
        audio_b64: "AAAA",
        mime_type: "audio/webm"
      },
      new AbortController().signal
    );

    expect(transcriptionResult).toEqual({
      provider: "google",
      model_id: "models/gemini-2.5-flash",
      text: "hello world"
    });
    expect(registry.transcribeAudio).toHaveBeenCalledTimes(1);
  });

  it("maps provider list errors to dispatcher errors", async () => {
    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => {
          const error = new Error("rate limit") as Error & { code: string; retryable: boolean };
          error.code = "PROVIDER_RATE_LIMITED";
          error.retryable = true;
          throw error;
        })
      }
    });

    await expect(
      dispatcher.dispatch(
        "ProviderListModels",
        "__system__",
        {
          provider: "openai",
          api_key: "sk-test"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "PROVIDER_RATE_LIMITED",
      retryable: true
    });
  });

  it("delegates provider defaults and catalog actions to provider state", async () => {
    const providerState = {
      getDefaults: vi.fn(async () => ({
        provider: "openai" as const,
        selected_model: "gpt-5.2",
        thinking_level: "high"
      })),
      setDefaults: vi.fn(async (input) => ({
        provider: input.provider,
        selected_model: input.selected_model,
        thinking_level: input.thinking_level,
        execution: { request_shape: { reasoning: { effort: "high" } } }
      })),
      getCatalog: vi.fn(async () => ({
        provider: "openai" as const,
        sync_status: "ok" as const,
        models: [{ provider: "openai" as const, id: "gpt-5.2" }]
      })),
      syncCatalog: vi.fn(async (input) => ({
        provider: input.provider,
        sync_status: "ok" as const,
        models: [{ provider: input.provider, id: "gpt-5.2" }]
      })),
      primeFromEnvironment: vi.fn(async () => {})
    };

    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "openai" as const, models: ["gpt-5.2"] })),
        buildExecutionConfig: vi.fn(() => ({ provider: "openai" as const, request_shape: {} }))
      },
      providerState
    });

    await expect(
      dispatcher.dispatch(
        "ProviderDefaultsPut",
        "__system__",
        {
          provider: "openai",
          selected_model: "gpt-5.2",
          thinking_level: "high"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      provider: "openai",
      selected_model: "gpt-5.2"
    });

    await expect(
      dispatcher.dispatch(
        "ProviderDefaultsGet",
        "__system__",
        {
          provider: "openai"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      provider: "openai",
      selected_model: "gpt-5.2"
    });

    await expect(
      dispatcher.dispatch(
        "ProviderCatalogSync",
        "__system__",
        {
          provider: "openai",
          api_key: "sk-test"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      provider: "openai",
      sync_status: "ok"
    });

    await expect(
      dispatcher.dispatch(
        "ProviderCatalogGet",
        "__system__",
        {
          provider: "openai"
        },
        new AbortController().signal
      )
    ).resolves.toMatchObject({
      provider: "openai",
      sync_status: "ok"
    });
  });

  it("delegates agent lifecycle actions when orchestrator is configured", async () => {
    const orchestrator = {
      run: vi.fn(async () => ({ run_id: "run-1", status: "started" as const })),
      pause: vi.fn(async () => ({ run_id: "run-1", status: "pausing" as const })),
      resume: vi.fn(async () => ({ run_id: "run-1", status: "running" as const })),
      steer: vi.fn(async () => ({ run_id: "run-1", status: "queued" as const, queued_count: 1 })),
      stop: vi.fn(async () => ({ run_id: "run-1", status: "stopped" as const })),
      getState: vi.fn(async () => ({ run_id: "run-1", status: "running" as const, steps: [] }))
    };

    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "openai" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "openai" as const, models: ["gpt-4.1-mini"] }))
      },
      orchestrator
    });

    await expect(
      dispatcher.dispatch(
        "AgentRun",
        "__system__",
        {
          prompt: "Open page",
          provider: "openai",
          api_key: "sk-test",
          base_url: "https://api.openai.com/v1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "started"
    });

    expect(orchestrator.run).toHaveBeenCalledWith({
      prompt: "Open page",
      tab_id: undefined,
      provider: "openai",
      model: undefined,
      max_steps: undefined,
      has_image_input: undefined,
      api_key: "sk-test",
      base_url: "https://api.openai.com/v1"
    });

    await expect(
      dispatcher.dispatch(
        "AgentGetState",
        "__system__",
        {
          run_id: "run-1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "running",
      steps: []
    });

    await expect(
      dispatcher.dispatch(
        "AgentPause",
        "__system__",
        {
          run_id: "run-1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "pausing"
    });

    await expect(
      dispatcher.dispatch(
        "AgentResume",
        "__system__",
        {
          run_id: "run-1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "running"
    });

    await expect(
      dispatcher.dispatch(
        "AgentSteer",
        "__system__",
        {
          run_id: "run-1",
          prompt: "Actually use the latest note I just added."
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "queued",
      queued_count: 1
    });

    await expect(
      dispatcher.dispatch(
        "AgentStop",
        "__system__",
        {
          run_id: "run-1"
        },
        new AbortController().signal
      )
    ).resolves.toEqual({
      run_id: "run-1",
      status: "stopped"
    });

    expect(orchestrator.pause).toHaveBeenCalledWith({
      run_id: "run-1"
    });
    expect(orchestrator.resume).toHaveBeenCalledWith({
      run_id: "run-1"
    });
    expect(orchestrator.steer).toHaveBeenCalledWith({
      run_id: "run-1",
      prompt: "Actually use the latest note I just added."
    });
  });

  it("delegates browser-control benchmark requests to the configured benchmark runner", async () => {
    const benchmarkRunner = vi.fn(async () => ({
      provider: "google" as const,
      model_id: "models/gemini-2.5-flash",
      benchmark_kind: "gemini-browser-control-course" as const,
      generated_at: "2026-03-06T15:45:00.000Z",
      search_excluded: true,
      policy_status: "approved" as const,
      output_dir: "/tmp/live-gemini-browser-course",
      summary_path: "/tmp/live-gemini-browser-course/summary.json",
      summary: {
        model_id: "models/gemini-2.5-flash",
        cost_tier: "low" as const,
        pass_count: 6,
        total_count: 6,
        hard_failure_count: 0,
        median_elapsed_ms: 11_000,
        failure_modes: []
      }
    }));

    const dispatcher = createSystemDispatcher({
      getRuntimeState: () => ({
        mode: "ping_only",
        tabs: [],
        browser_policy: "ungoogled_only",
        extension_loaded: false
      }),
      providerRegistry: {
        validate: vi.fn(async () => ({ provider: "google" as const, ok: true })),
        listModels: vi.fn(async () => ({ provider: "google" as const, models: ["models/gemini-2.5-flash"] }))
      },
      benchmarkRunner
    });

    const result = await dispatcher.dispatch(
      "ProviderBenchmarkBrowserControl",
      "__system__",
      {
        provider: "google",
        model_id: "models/gemini-2.5-flash"
      },
      new AbortController().signal
    );

    expect(benchmarkRunner).toHaveBeenCalledWith({
      provider: "google",
      model_id: "models/gemini-2.5-flash"
    });
    expect(result).toEqual(expect.objectContaining({
      provider: "google",
      model_id: "models/gemini-2.5-flash",
      policy_status: "approved"
    }));
  });
});
