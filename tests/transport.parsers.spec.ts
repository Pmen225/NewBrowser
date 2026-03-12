import { describe, expect, it } from "vitest";

import {
  parseAgentPauseParams,
  normalizeToolRpcAction,
  parseAgentRunParams,
  parseAgentResumeParams,
  parseAgentSteerParams,
  parseProviderTranscribeAudioParams,
  parseBrowserRpcParams,
  parseFindParams,
  parseGetRuntimeStateParams,
  parseGetPageTextParams,
  parseProviderListModelsParams,
  parseTodoWriteParams,
  parseProviderValidateParams,
  parseSearchWebParams,
  parseSetActiveTabParams
} from "../shared/src/transport";

describe("transport parsers", () => {
  it("parses SetActiveTab with optional target_id", () => {
    expect(
      parseSetActiveTabParams({
        chrome_tab_id: 42,
        target_id: "target-1",
        url: "https://example.com",
        title: "Example"
      })
    ).toEqual({
      chrome_tab_id: 42,
      target_id: "target-1",
      url: "https://example.com",
      title: "Example"
    });

    expect(parseSetActiveTabParams({ chrome_tab_id: 42, target_id: "" })).toBeNull();
  });

  it("parses SetActiveTab without chrome_tab_id when explicit target metadata is present", () => {
    expect(
      parseSetActiveTabParams({
        target_id: "target-1",
        url: "http://127.0.0.1:4317/upload",
        title: "Upload"
      })
    ).toEqual({
      chrome_tab_id: undefined,
      target_id: "target-1",
      url: "http://127.0.0.1:4317/upload",
      title: "Upload"
    });

    expect(parseSetActiveTabParams({ url: "http://127.0.0.1:4317/upload" })).toBeNull();
  });

  it("parses GetRuntimeState with empty object only", () => {
    expect(parseGetRuntimeStateParams({})).toEqual({});
    expect(parseGetRuntimeStateParams({ extra: true })).toBeNull();
  });

  it("parses ProviderValidate params", () => {
    expect(
      parseProviderValidateParams({
        provider: "openai",
        api_key: "sk-test",
        base_url: "https://api.openai.com/v1",
        model: "gpt-4.1-mini",
        timeout_ms: 1000
      })
    ).toEqual({
      provider: "openai",
      api_key: "sk-test",
      base_url: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      timeout_ms: 1000
    });

    expect(parseProviderValidateParams({ provider: "openai", api_key: "" })).toBeNull();
    expect(parseProviderValidateParams({ provider: "deepseek", api_key: "sk-deepseek" })).toEqual({
      provider: "deepseek",
      api_key: "sk-deepseek",
      base_url: undefined,
      model: undefined,
      timeout_ms: undefined
    });
  });

  it("parses ProviderListModels params", () => {
    expect(
      parseProviderListModelsParams({
        provider: "anthropic",
        api_key: "sk-ant",
        base_url: "https://api.anthropic.com/v1"
      })
    ).toEqual({
      provider: "anthropic",
      api_key: "sk-ant",
      base_url: "https://api.anthropic.com/v1"
    });

    expect(parseProviderListModelsParams({ provider: "anthropic" })).toBeNull();
    expect(parseProviderListModelsParams({ provider: "invalid", api_key: "x" })).toBeNull();
  });

  it("parses canonical browser action aliases", () => {
    expect(parseBrowserRpcParams("navigate", { mode: "to", url: "https://example.com" })).toEqual({
      mode: "to",
      url: "https://example.com",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });

    expect(parseBrowserRpcParams("navigate", {
      mode: "to",
      url: "chrome://settings",
      allow_sensitive_browser_pages: true
    })).toEqual({
      mode: "to",
      url: "chrome://settings",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: true
    });

    expect(parseBrowserRpcParams("tabs_create", { url: "https://example.com" })).toEqual({
      operation: "create",
      url: "https://example.com"
    });
    expect(parseBrowserRpcParams("tabs_create", { operation: "list" })).toEqual({
      operation: "list",
      target_tab_id: undefined,
      url: undefined
    });

    expect(parseBrowserRpcParams("computer", { action: "screenshot" })).toEqual({
      steps: [{ kind: "screenshot" }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        steps: [{ action: "screenshot" }]
      })
    ).toEqual({
      steps: [{ kind: "screenshot" }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        steps: [{ action: "click", ref_id: "f0:123" }]
      })
    ).toEqual({
      steps: [{ kind: "click", ref: "f0:123", x: undefined, y: undefined, button: "left", click_count: 1 }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "accept_dialog"
      })
    ).toEqual({
      steps: [{ kind: "dialog", accept: true, prompt_text: undefined }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "dialog",
        accept: false
      })
    ).toEqual({
      steps: [{ kind: "dialog", accept: false, prompt_text: undefined }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "dialog",
        text: "Atlas prompt"
      })
    ).toEqual({
      steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "prompt",
        text: "Atlas prompt"
      })
    ).toEqual({
      steps: [{ kind: "dialog", accept: true, prompt_text: "Atlas prompt" }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "accept"
      })
    ).toEqual({
      steps: [{ kind: "dialog", accept: true, prompt_text: undefined }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "left_click",
        coordinate: [12, 24]
      })
    ).toEqual({
      steps: [{ kind: "click", x: 12, y: 24, button: "left", click_count: 1 }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "type",
        text: "Hello"
      })
    ).toEqual({
      steps: [{ kind: "type", ref: undefined, text: "Hello" }]
    });

    expect(
      parseBrowserRpcParams("computer", {
        action: "scroll",
        coordinate: [50, 60],
        scroll_parameters: {
          scroll_direction: "down",
          scroll_amount: 3
        }
      })
    ).toEqual({
      steps: [{ kind: "scroll", x: 50, y: 60, delta_x: 0, delta_y: 360 }]
    });

    expect(
      parseBrowserRpcParams("form_input", {
        ref: "f0:123",
        value: "hello@example.com"
      })
    ).toEqual({
      fields: [{ ref: "f0:123", kind: "text", value: "hello@example.com" }]
    });

    expect(
      parseBrowserRpcParams("form_input", {
        fields: [{ ref: "f0:234", value: "2" }]
      })
    ).toEqual({
      fields: [{ ref: "f0:234", kind: "text", value: "2" }]
    });

    expect(
      parseBrowserRpcParams("form_input", {
        fields: [{ ref: "f0:345", value: true }]
      })
    ).toEqual({
      fields: [{ ref: "f0:345", kind: "checkbox", value: true }]
    });

    expect(
      parseBrowserRpcParams("form_input", {
        fields: [{ ref_id: "f0:456", value: "Atlas works" }]
      })
    ).toEqual({
      fields: [{ ref: "f0:456", kind: "text", value: "Atlas works" }]
    });

    expect(
      parseBrowserRpcParams("form_input", {
        fields: [{ ref: "f0:567", kind: "file", value: "/tmp/atlas-upload.txt" }]
      })
    ).toEqual({
      fields: [{ ref: "f0:567", kind: "file", value: "/tmp/atlas-upload.txt" }]
    });
  });

  it("parses compact follow-up history for AgentRun", () => {
    expect(
      parseAgentRunParams({
        prompt: "What did you just do?",
        provider: "google",
        model: "models/gemini-2.5-flash",
        allow_browser_admin_pages: true,
        allow_local_shell: true,
        allow_extension_management: true,
        memory_items: [
          { id: "manual:1", source: "manual", text: "Prince works in Halo Service Desk." }
        ],
        history_messages: [
          { role: "user", text: "Go to Google." },
          { role: "assistant", text: "I navigated to Google." }
        ]
      })
    ).toEqual({
      prompt: "What did you just do?",
      tab_id: undefined,
      provider: "google",
      model: "models/gemini-2.5-flash",
      max_steps: undefined,
      max_actions_per_step: undefined,
      failure_tolerance: undefined,
      enable_vision: undefined,
      display_highlights: undefined,
      replanning_frequency: undefined,
      page_load_wait_ms: undefined,
      replay_history: undefined,
      history_messages: [
        { role: "user", text: "Go to Google." },
        { role: "assistant", text: "I navigated to Google." }
      ],
      memory_items: [
        { id: "manual:1", source: "manual", text: "Prince works in Halo Service Desk." }
      ],
      has_image_input: undefined,
      images: undefined,
      api_key: undefined,
      base_url: undefined,
      thinking_level: undefined,
      enable_function_calling: undefined,
      allow_browser_search: undefined,
      enable_code_execution: undefined,
      allow_browser_admin_pages: true,
      allow_local_shell: true,
      allow_extension_management: true
    });

    expect(
      parseAgentRunParams({
        prompt: "What did you just do?",
        provider: "google",
        history_messages: [{ role: "system", text: "bad role" }]
      })
    ).toBeNull();

    expect(
      parseAgentRunParams({
        prompt: "What did you just do?",
        provider: "google",
        history_messages: [{ role: "user", text: "" }]
      })
    ).toBeNull();
  });

  it("parses extension management browser actions", () => {
    expect(parseBrowserRpcParams("extensions_manage", { operation: "list", query: "adblock" })).toEqual({
      operation: "list",
      extension_id: undefined,
      query: "adblock"
    });

    expect(parseBrowserRpcParams("extensions_manage", { operation: "disable", extension_id: "abcdef" })).toEqual({
      operation: "disable",
      extension_id: "abcdef",
      query: undefined
    });

    expect(parseBrowserRpcParams("extensions_manage", { operation: "disable" })).toBeNull();
  });

  it("parses queued steer prompts for active runs", () => {
    expect(
      parseAgentSteerParams({
        run_id: "run-123",
        prompt: "Actually use the current ticket title as the search term."
      })
    ).toEqual({
      run_id: "run-123",
      prompt: "Actually use the current ticket title as the search term."
    });

    expect(
      parseAgentSteerParams({
        run_id: "",
        prompt: "bad"
      })
    ).toBeNull();

    expect(
      parseAgentSteerParams({
        run_id: "run-123",
        prompt: ""
      })
    ).toBeNull();
  });

  it("parses provider-backed audio transcription params", () => {
    expect(
      parseProviderTranscribeAudioParams({
        provider: "google",
        model_id: "models/gemini-2.5-flash",
        api_key: "g-test",
        audio_b64: "AAAA",
        mime_type: "audio/webm",
        language: "en-GB"
      })
    ).toEqual({
      provider: "google",
      model_id: "models/gemini-2.5-flash",
      api_key: "g-test",
      base_url: undefined,
      audio_b64: "AAAA",
      mime_type: "audio/webm",
      language: "en-GB"
    });

    expect(
      parseProviderTranscribeAudioParams({
        provider: "google",
        model_id: "",
        api_key: "g-test",
        audio_b64: "AAAA",
        mime_type: "audio/webm"
      })
    ).toBeNull();
  });

  it("normalizes documented navigate shortcut params", () => {
    expect(parseBrowserRpcParams("navigate", { url: "https://example.com" })).toEqual({
      mode: "to",
      url: "https://example.com",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { url: "example.com" })).toEqual({
      mode: "to",
      url: "example.com",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "url", url: "https://example.com/path" })).toEqual({
      mode: "to",
      url: "https://example.com/path",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "direct", url: "https://example.com/direct" })).toEqual({
      mode: "to",
      url: "https://example.com/direct",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "new_tab", url: "chrome://settings" })).toEqual({
      mode: "to",
      url: "chrome://settings",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "current_tab", url: "chrome://flags" })).toEqual({
      mode: "to",
      url: "chrome://flags",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "primary", url: "chrome://settings" })).toEqual({
      mode: "to",
      url: "chrome://settings",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "active_tab", url: "https://example.com/active" })).toEqual({
      mode: "to",
      url: "https://example.com/active",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });
    expect(parseBrowserRpcParams("navigate", { mode: "gpt_history", url: "https://example.com/history" })).toEqual({
      mode: "to",
      url: "https://example.com/history",
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });

    expect(parseBrowserRpcParams("navigate", { url: "back" })).toEqual({
      mode: "back",
      url: undefined,
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });

    expect(parseBrowserRpcParams("navigate", { url: "forward" })).toEqual({
      mode: "forward",
      url: undefined,
      timeout_ms: undefined,
      allow_sensitive_browser_pages: undefined
    });

    expect(parseBrowserRpcParams("navigate", { url: "" })).toBeNull();
    expect(parseBrowserRpcParams("navigate", { mode: "sideways", url: "https://example.com" })).toBeNull();
  });

  it("normalizes canonical and legacy tool action names", () => {
    expect(normalizeToolRpcAction("read_page")).toBe("read_page");
    expect(normalizeToolRpcAction("ReadPage")).toBe("read_page");
    expect(normalizeToolRpcAction("Find")).toBe("find");
    expect(normalizeToolRpcAction("GetPageText")).toBe("get_page_text");
    expect(normalizeToolRpcAction("SearchWeb")).toBe("search_web");
    expect(normalizeToolRpcAction("TodoWrite")).toBe("todo_write");
    expect(normalizeToolRpcAction("UnknownTool")).toBeNull();
  });

  it("parses new discovery/todo/agent params", () => {
    expect(parseFindParams({ query: "search box", limit: 10 })).toEqual({
      query: "search box",
      tab_id: undefined,
      limit: 10
    });

    expect(parseGetPageTextParams({ max_chars: 5000 })).toEqual({
      tab_id: undefined,
      max_chars: 5000
    });

    expect(parseSearchWebParams({ queries: ["new browser"] })).toEqual({
      queries: ["new browser"]
    });

    expect(
      parseTodoWriteParams({
        todos: [
          {
            task: "Capture top stories",
            completed: false
          }
        ]
      })
    ).toEqual({
      todos: [
        {
          content: "Capture top stories",
          status: "pending",
          active_form: undefined
        }
      ]
    });

    expect(
      parseAgentRunParams({
        prompt: "Read the page and summarize",
        provider: "deepseek",
        model: "deepseek-chat",
        max_steps: 10,
        api_key: "sk-test",
        base_url: "https://api.deepseek.com"
      })
    ).toEqual({
      prompt: "Read the page and summarize",
      tab_id: undefined,
      provider: "deepseek",
      model: "deepseek-chat",
      max_steps: 10,
      has_image_input: undefined,
      api_key: "sk-test",
      base_url: "https://api.deepseek.com"
    });

    expect(
      parseAgentRunParams({
        prompt: "Read the page and summarize",
        provider: "deepseek",
        api_key: ""
      })
    ).toBeNull();

    expect(parseAgentPauseParams({ run_id: "run-1" })).toEqual({
      run_id: "run-1"
    });
    expect(parseAgentResumeParams({ run_id: "run-1" })).toEqual({
      run_id: "run-1"
    });
    expect(parseAgentPauseParams({ run_id: "" })).toBeNull();
    expect(parseAgentResumeParams({ run_id: "" })).toBeNull();
  });
});
