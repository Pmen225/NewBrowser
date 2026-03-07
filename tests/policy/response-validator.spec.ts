import { describe, expect, it } from "vitest";

import {
  buildValidatedFinalAnswer,
  enforceUserFacingResponsePayload,
  validateFinalAnswer,
  validateFinalAnswerWithAutofix
} from "../../sidecar/src/policy/response-validator";

describe("response validator", () => {
  it("accepts compliant inline citations in the user's language", () => {
    const result = validateFinalAnswer({
      userPrompt: "Resume la pagina",
      text: "<answer>Se completo la lectura de la pagina.[web:1]</answer>",
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.normalized_text).toBe("<answer>Se completo la lectura de la pagina.[web:1]</answer>");
  });

  it("rejects missing citations and raw ids", () => {
    const result = validateFinalAnswer({
      userPrompt: "Summarize the page",
      text: "<answer>Run 7d8f9a4e-1111-2222-3333-444455556666 completed.\nReferences:\n- [web:1]</answer>",
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(false);
    expect(result.violations.map((violation) => violation.rule_id)).toEqual(
      expect.arrayContaining([
        "inline_citations_required",
        "raw_ids_forbidden_in_final_response"
      ])
    );
  });

  it("rejects language mismatches when the user prompt is non-English", () => {
    const result = validateFinalAnswer({
      userPrompt: "Resume la pagina actual",
      text: "<answer>Completed the page summary.[web:1]</answer>",
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(false);
    expect(result.violations.map((violation) => violation.rule_id)).toContain("response_language_mismatch");
  });

  it("auto-fixes missing inline citations when citation availability is known", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize the page",
      text: "<answer>The page confirms the release date.</answer>",
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toContain("[web:1]");
    expect(result.normalized_text).toMatch(/^<answer>.*<\/answer>$/);
  });

  it("auto-fixes markdown tables missing header separators", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize and compare options",
      text: `<answer>| Tool | Price |\n| Asana | $10 |\n| Notion | $8 | [web:1]</answer>`,
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toContain("| --- | --- |");
  });

  it("removes runaway markdown table separators", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Compare options",
      text: `<answer>| Item | Cost |\n| --- | --- |\n| A | 1 |\n| --- | --- |\n| --- | --- |\n| --- | --- | [web:1]</answer>`,
      availableCitations: ["[web:1]"]
    });

    const separators = result.normalized_text.match(/\|\s*---\s*\|\s*---\s*\|/g) ?? [];
    expect(result.ok).toBe(true);
    expect(separators).toHaveLength(1);
  });

  it("repairs references blocks and unknown citations", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize the page",
      text: `<answer>Top finding is stable demand.[web:99]\nReferences:\n- [web:99]</answer>`,
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toContain("[web:1]");
    expect(result.normalized_text.toLowerCase()).not.toContain("references:");
    expect(result.normalized_text).not.toContain("[web:99]");
  });

  it("repairs raw tool tags and raw ids instead of falling back", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize the page",
      text: `<answer><tab id=\"abc\">Run run-unsafe used id 7d8f9a4e-1111-2222-3333-444455556666.[web:1]</tab></answer>`,
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toContain("[web:1]");
    expect(result.normalized_text).not.toContain("<tab");
    expect(result.normalized_text).not.toContain("7d8f9a4e-1111-2222-3333-444455556666");
    expect(result.normalized_text).not.toContain("run-unsafe");
  });

  it("adds image acknowledgement when missing", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize this image",
      text: "<answer>The chart shows a trend.[web:1]</answer>",
      availableCitations: ["[web:1]"],
      hasImageInput: true
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text.toLowerCase()).toContain("image");
  });

  it("flattens markdown-heavy observation answers into plain text for direct observation prompts", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "What do you see?",
      text: `<answer># Ticket view

- **Title:** Reps for the groups
- **Owner:** Prince Mensah
- **User:** Jolita Danilevice
- **State:** In Progress [screenshot:1]</answer>`,
      availableCitations: ["[screenshot:1]"],
      hasImageInput: true
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toContain("Image:");
    expect(result.normalized_text).not.toContain("#");
    expect(result.normalized_text).not.toContain("**");
    expect(result.normalized_text).not.toContain("\n- ");
  });

  it("drops embedded nested answer tails", () => {
    const result = validateFinalAnswerWithAutofix({
      userPrompt: "Summarize",
      text: "<answer>Primary summary.[web:1] <answer>Duplicate summary.[web:1]</answer></answer>",
      availableCitations: ["[web:1]"]
    });

    expect(result.ok).toBe(true);
    expect(result.normalized_text).toBe("<answer>Primary summary.[web:1]</answer>");
  });

  it("sanitizes agent state final answers in centralized response handling", () => {
    const result = enforceUserFacingResponsePayload("AgentGetState", {
      run_id: "run-1",
      status: "completed",
      final_answer: "Completed run-unsafe without a citation.",
      user_language: "en",
      sources: [
        {
          id: "[web:1]",
          origin: "web"
        }
      ]
    });

    expect(result.final_answer).toMatch(/^<answer>.*<\/answer>$/);
    expect(result.final_answer).toContain("[web:1]");
    expect(result.final_answer).not.toContain("run-unsafe");
  });

  it("forces image acknowledgement in centralized response handling", () => {
    const result = enforceUserFacingResponsePayload("AgentGetState", {
      run_id: "run-2",
      status: "completed",
      final_answer: "Completed 1 step.[web:1]",
      user_language: "en",
      has_image_input: true,
      sources: [
        {
          id: "[web:1]",
          origin: "web"
        }
      ]
    });

    expect(result.final_answer).toMatch(/^<answer>.*<\/answer>$/);
    expect(result.final_answer).toContain("image");
    expect(result.final_answer).toContain("[web:1]");
  });

  it("builds wrapped validated answers", () => {
    const result = buildValidatedFinalAnswer({
      userPrompt: "Summarize the page",
      executedSteps: 2,
      availableCitations: ["[web:1]"]
    });

    expect(result.text).toMatch(/^<answer>.*<\/answer>$/);
    expect(result.text).toContain("[web:1]");
  });

  it("wraps valid unwrapped answers in centralized response handling", () => {
    const result = enforceUserFacingResponsePayload("AgentGetState", {
      run_id: "run-3",
      status: "completed",
      final_answer: "Completed 2 step(s).[web:1]",
      user_language: "en",
      sources: [
        {
          id: "[web:1]",
          origin: "web"
        }
      ]
    });

    expect(result.final_answer).toBe("<answer>Completed 2 step(s).[web:1]</answer>");
  });

  it("does not double-wrap already wrapped answers", () => {
    const result = enforceUserFacingResponsePayload("AgentGetState", {
      run_id: "run-4",
      status: "completed",
      final_answer: "<answer>Completed 2 step(s).[web:1]</answer>",
      user_language: "en",
      sources: [
        {
          id: "[web:1]",
          origin: "web"
        }
      ]
    });

    expect(result.final_answer).toBe("<answer>Completed 2 step(s).[web:1]</answer>");
  });
});
