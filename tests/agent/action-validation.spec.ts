import { describe, expect, it } from "vitest";

import {
  allowsValidationPendingComputerAction,
  hasMultipleStateChangingComputerSteps,
  isClickThenDialogComputerAction,
  isDialogOnlyComputerAction,
  requiresValidationAfterPageAction
} from "../../sidecar/src/agent/action-validation";

describe("dialog-aware action validation", () => {
  it("treats a dialog-only computer action as the legal recovery step for an open JavaScript dialog", () => {
    const payload = {
      steps: [
        {
          kind: "dialog",
          accept: true,
          prompt_text: "Atlas"
        }
      ]
    };

    expect(isDialogOnlyComputerAction(payload)).toBe(true);
    expect(allowsValidationPendingComputerAction("computer", payload, true)).toBe(true);
    expect(allowsValidationPendingComputerAction("computer", payload, false)).toBe(false);
  });

  it("allows an immediate click then dialog sequence without treating it as an invalid multi-mutation batch", () => {
    const payload = {
      steps: [
        {
          kind: "click",
          ref: "f0:prompt-button"
        },
        {
          kind: "dialog",
          accept: true,
          prompt_text: "Atlas"
        }
      ]
    };

    expect(isClickThenDialogComputerAction(payload)).toBe(true);
    expect(hasMultipleStateChangingComputerSteps(payload)).toBe(false);
    expect(requiresValidationAfterPageAction("computer", payload, {})).toBe(true);
  });

  it("keeps blocking unrelated multi-step computer mutations", () => {
    const payload = {
      steps: [
        {
          kind: "click",
          ref: "f0:first"
        },
        {
          kind: "click",
          ref: "f0:second"
        }
      ]
    };

    expect(isClickThenDialogComputerAction(payload)).toBe(false);
    expect(hasMultipleStateChangingComputerSteps(payload)).toBe(true);
  });
});
