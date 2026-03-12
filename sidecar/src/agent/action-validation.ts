import type { JsonObject } from "../../../shared/src/transport";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getComputerSteps(payload: JsonObject): Record<string, unknown>[] {
  return Array.isArray(payload.steps) ? payload.steps.filter(isRecord) : [];
}

function getComputerStepKind(step: Record<string, unknown>): string {
  return typeof step.kind === "string" ? step.kind.trim().toLowerCase() : "";
}

export function isDialogOnlyComputerAction(payload: JsonObject): boolean {
  const steps = getComputerSteps(payload);
  return steps.length === 1 && getComputerStepKind(steps[0]) === "dialog";
}

export function isClickThenDialogComputerAction(payload: JsonObject): boolean {
  const steps = getComputerSteps(payload);
  return (
    steps.length === 2 &&
    getComputerStepKind(steps[0]) === "click" &&
    getComputerStepKind(steps[1]) === "dialog"
  );
}

export function countStateChangingComputerSteps(payload: JsonObject): number {
  const steps = getComputerSteps(payload);
  let count = 0;

  for (const step of steps) {
    const kind = getComputerStepKind(step);
    if (kind === "click" || kind === "type" || kind === "key" || kind === "drag" || kind === "dialog") {
      count += 1;
    }
  }

  return count;
}

export function hasMultipleStateChangingComputerSteps(payload: JsonObject): boolean {
  if (isClickThenDialogComputerAction(payload)) {
    return false;
  }
  return countStateChangingComputerSteps(payload) > 1;
}

export function requiresValidationAfterPageAction(action: string, payload: JsonObject, result: JsonObject): boolean {
  if (action === "computer") {
    return countStateChangingComputerSteps(payload) > 0;
  }

  if (action !== "form_input") {
    return false;
  }

  const applied = Array.isArray(result.applied) ? result.applied : [];
  if (applied.length === 0) {
    return true;
  }

  return applied.some((entry) => !isRecord(entry) || !Object.prototype.hasOwnProperty.call(entry, "confirmed_value"));
}

export function allowsValidationPendingComputerAction(
  action: string,
  payload: JsonObject,
  hasPendingJavaScriptDialog: boolean
): boolean {
  return action === "computer" && hasPendingJavaScriptDialog && isDialogOnlyComputerAction(payload);
}
