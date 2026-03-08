import { describe, expect, it, vi } from "vitest";

import type { PromptPolicy } from "../../sidecar/src/agent/types";
import { createActionPolicyGuard } from "../../sidecar/src/policy/action-policy";
import type { ActionDispatcher } from "../../sidecar/src/rpc/dispatcher";

function createPolicy(): PromptPolicy {
  return {
    inspectBeforeInteractiveActions: true,
    preferReadPageForInspection: true,
    preferGetPageTextForLongReading: true,
    preferSearchWebForGeneralSearch: true,
    requireFrequentTodoTracking: true,
    requireSameLanguageResponses: true,
    requireInlineCitations: true,
    disallowRawIdsInFinalResponse: true,
    disallowRawToolTagsInFinalResponse: true,
    disallowBibliographySection: true,
    disallowLyrics: true,
    requireTableHeaderRows: true,
    requireImageAcknowledgement: true,
    disallowExternalImageTransmission: true,
    blockGoogleSearchNavigation: true,
    blockArchiveAccess: true,
    blockSensitiveQueryParams: true,
    blockPasswordEntry: true,
    blockSensitiveIdentityFinancialInput: true,
    blockSensitiveBrowserDataAccess: true,
    blockHarmfulSearches: true
  };
}

function createBase(): ActionDispatcher {
  return {
    supports: () => true,
    dispatch: vi.fn(async () => ({ ok: true }))
  };
}

describe("action policy guard", () => {
  it("blocks google search navigation and requires search_web", async () => {
    const base = createBase();
    const guard = createActionPolicyGuard(base, {
      policy: createPolicy()
    });

    await expect(
      guard.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to",
          url: "https://www.google.com/search?q=test"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
      retryable: false,
      details: expect.objectContaining({
        rule_id: "general_search_requires_search_web"
      })
    });
  });

  it("blocks sensitive browser pages and sensitive query params", async () => {
    const base = createBase();
    const guard = createActionPolicyGuard(base, {
      policy: createPolicy()
    });

    await expect(
      guard.dispatch(
        "navigate",
        "tab-1",
        {
          mode: "to",
          url: "chrome://history"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
      details: expect.objectContaining({
        rule_id: "sensitive_browser_data_access_blocked"
      })
    });

    await expect(
      guard.dispatch(
        "Navigate",
        "tab-1",
        {
          mode: "to",
          url: "https://example.com/login?password=secret"
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
      details: expect.objectContaining({
        rule_id: "sensitive_query_params_blocked"
      })
    });
  });

  it("allows explicit browser-admin navigation when the request is elevated on purpose", async () => {
    const base = createBase();
    const guard = createActionPolicyGuard(base, {
      policy: createPolicy()
    });

    await expect(
      guard.dispatch(
        "navigate",
        "tab-1",
        {
          mode: "to",
          url: "chrome://flags",
          allow_sensitive_browser_pages: true
        },
        new AbortController().signal
      )
    ).resolves.toEqual({ ok: true });
  });

  it("blocks sensitive identity and financial data entry", async () => {
    const base = createBase();
    const guard = createActionPolicyGuard(base, {
      policy: createPolicy()
    });

    await expect(
      guard.dispatch(
        "FormInput",
        "tab-1",
        {
          fields: [
            {
              ref: "f0:101",
              kind: "text",
              value: "4111 1111 1111 1111"
            }
          ]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
      details: expect.objectContaining({
        rule_id: "sensitive_identity_financial_input_blocked"
      })
    });
  });

  it("blocks harmful search queries", async () => {
    const base = createBase();
    const guard = createActionPolicyGuard(base, {
      policy: createPolicy()
    });

    await expect(
      guard.dispatch(
        "search_web",
        "__system__",
        {
          queries: ["scrape facial images from social media"]
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
      details: expect.objectContaining({
        rule_id: "harmful_search_blocked"
      })
    });
  });
});
