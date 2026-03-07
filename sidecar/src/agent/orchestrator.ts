import { createHash, randomUUID } from "node:crypto";

import type {
  AgentGetStateParams,
  AgentPauseParams,
  AgentRunParams,
  AgentResumeParams,
  AgentStateResult,
  AgentTaskError,
  AgentTaskState,
  CreateSubagentParams,
  CreateSubagentResult,
  DraftArtifact,
  FindMatch,
  AgentStopParams,
  JsonObject,
  SourceAttribution,
  TodoItem
} from "../../../shared/src/transport";
import { createProviderRegistry } from "../llm/provider-registry";
import type { ProviderRegistry, ProviderRuntimeMessage, ProviderImagePart, ProviderThinkingLevel } from "../llm/types";
import { redactSensitiveJson } from "../observability/redaction";
import {
  buildValidatedFinalAnswer,
  detectLanguageFromText,
  enforceUserFacingResponsePayload,
  validateFinalAnswerWithAutofix
} from "../policy/response-validator";
import { createMemoryStore } from "./memory-store";
import { loadPromptSpecs, type PromptLoaderOptions } from "./prompt-loader";
import { buildToolSchemaCatalog, findToolCatalogMismatches } from "./tool-schema";
import { createTaskManager } from "./task-manager";
import type {
  AgentMemoryStore,
  AgentOrchestrator,
  AgentRunState,
  ExecutorAgent,
  ExecutorStepEvent,
  PlannerAgent,
  PlannedToolBinding,
  PlannedToolStep,
  PromptPolicy,
  PromptSpecs
} from "./types";

export interface AgentToolEvent {
  type: "tool_start" | "tool_done";
  run_id: string;
  tool_name?: string;
  // Comet RUM vital field: step_type / stepType for observability (e.stepType in Comet source)
  step_type?: string;
  tool_call_id: string;
  tool_input?: Record<string, unknown>;
  ok?: boolean;
  // Comet RUM: operation_key and failure_reason for diagnostics
  operation_key?: string;
  failure_reason?: string;
}

export interface OrchestratorOptions {
  promptLoader?: PromptLoaderOptions;
  promptSpecs?: PromptSpecs;
  memoryStore?: AgentMemoryStore;
  providerRegistry?: ProviderRegistry;
  defaultMaxSteps?: number;
  resolveDefaultTabId: () => string | undefined;
  performAction: (action: string, tabId: string, params: Record<string, unknown>, signal: AbortSignal) => Promise<Record<string, unknown>>;
  onRunUpdated?: (state: AgentRunState) => void;
  onToolEvent?: (event: AgentToolEvent) => void;
}

interface NormalizedExecutorError {
  code: string;
  message: string;
  retryable: boolean;
}

const KNOWN_TOOL_NAMES = [
  "navigate",
  "computer",
  "read_page",
  "find",
  "form_input",
  "get_page_text",
  "search_web",
  "tabs_create",
  "draft_email",
  "todo_write"
] as const;
const EMPTY_PROVIDER_TURN_MAX_RETRIES = 1;
const EMPTY_PROVIDER_TURN_RETRY_DELAY_MS = 250;

function nowIso(): string {
  return new Date().toISOString();
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => { setTimeout(res, ms); });
}

function cloneState(state: AgentRunState): AgentRunState {
  return {
    ...state,
    steps: [...state.steps],
    sources: [...state.sources],
    children: [...state.children],
    childError: state.childError ? { ...state.childError } : undefined
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildConversationHistoryMessages(params: AgentRunParams): ProviderRuntimeMessage[] {
  if (!Array.isArray(params.history_messages) || params.history_messages.length === 0) {
    return [];
  }

  return params.history_messages.map((message) => ({
    role: message.role,
    content: message.text
  }));
}

function isDirectObservationPrompt(prompt: string, hasImageInput: boolean): boolean {
  const lower = normalizeText(prompt).toLowerCase();
  if (
    includesAny(lower, [
      "what do you see",
      "what can you see",
      "tell me what you see",
      "describe what you see",
      "what is visible",
      "what's visible",
      "what do you notice"
    ])
  ) {
    return true;
  }

  if (!hasImageInput) {
    return false;
  }

  return includesAny(lower, [
    "describe this image",
    "describe the image",
    "describe this screenshot",
    "describe the screenshot",
    "summarize this image",
    "summarize the image",
    "summarize this screenshot",
    "summarize the screenshot"
  ]);
}

function buildObservationResponseInstruction(prompt: string, hasImageInput: boolean): ProviderRuntimeMessage[] {
  if (!isDirectObservationPrompt(prompt, hasImageInput)) {
    return [];
  }

  return [
    {
      role: "system",
      content:
        "For direct observation requests, answer in plain text only. No markdown, headers, bullets, or tables. Use as few words as possible and include only key facts."
    }
  ];
}

function shouldExposeTabManagementTool(prompt: string): boolean {
  const lower = normalizeText(prompt).toLowerCase();
  return includesAny(lower, [
    "new tab",
    "open tab",
    "another tab",
    "switch tab",
    "change tab",
    "close tab",
    "list tabs",
    "group tabs",
    "ungroup tabs",
    "tab group",
    "move tab"
  ]);
}

function buildTaskState(state: AgentRunState): AgentTaskState {
  return {
    task_id: state.taskId,
    run_id: state.runId,
    parent_task_id: state.parentTaskId,
    role: state.role,
    visibility: state.visibility,
    status: state.status,
    children: [...state.children],
    active_child_task_id: state.activeChildTaskId,
    child_summary: state.childSummary,
    child_error: state.childError ? { ...state.childError } : undefined,
    last_validated_observation: state.lastValidatedObservation
  };
}

function buildStateResult(state: AgentRunState): AgentStateResult {
  const snapshot: AgentStateResult = {
    run_id: state.runId,
    status: state.status,
    steps: state.steps,
    sources: [...state.sources],
    final_answer: state.finalAnswer,
    draft_artifact: state.draftArtifact,
    error_message: state.errorMessage,
    user_language: state.userLanguage,
    has_image_input: state.hasImageInput,
    task: buildTaskState(state)
  };

  return enforceUserFacingResponsePayload("AgentGetState", snapshot as unknown as JsonObject) as unknown as AgentStateResult;
}

function createRunState(
  params: AgentRunParams,
  meta?: {
    role?: AgentRunState["role"];
    visibility?: AgentRunState["visibility"];
    parentTaskId?: string;
  }
): AgentRunState {
  const now = nowIso();
  const hasImageInput = params.has_image_input === true || (Array.isArray(params.images) && params.images.length > 0);
  const sources: SourceAttribution[] = [
    {
      id: "user:prompt",
      origin: "user",
      label: "User request"
    },
    {
      id: "system:policy",
      origin: "system",
      label: "System prompt policy"
    }
  ];

  if (hasImageInput) {
    sources.push({
      id: "image:input",
      origin: "image",
      label: "User-supplied image"
    });
  }

  return {
    runId: randomUUID(),
    taskId: randomUUID(),
    role: meta?.role ?? "primary",
    visibility: meta?.visibility ?? "panel",
    parentTaskId: meta?.parentTaskId,
    children: [],
    status: "running",
    startedAt: now,
    updatedAt: now,
    params,
    steps: [],
    userLanguage: detectLanguageFromText(params.prompt),
    hasImageInput,
    sources,
    abortController: new AbortController(),
    pauseRequested: false,
    resumeRequested: false,
    resumeNeedsReassessment: false,
    resumeGate: undefined,
    releaseResumeGate: null,
    activeChildTaskId: undefined,
    childSummary: undefined,
    childError: undefined,
    lastValidatedObservation: undefined
  };
}

const RESUME_REASSESSMENT_PROMPT =
  "The user took control of the browser and may have changed the page. Reassess the current page state before taking any further actions.";

function updateRunStatus(
  state: AgentRunState,
  status: AgentRunState["status"],
  memoryStore: AgentMemoryStore,
  onRunUpdated?: (state: AgentRunState) => void,
  patch?: JsonObject
): void {
  state.status = status;
  state.updatedAt = nowIso();
  memoryStore.upsert(state.runId, {
    status: state.status,
    ...(patch ?? {})
  });
  onRunUpdated?.(cloneState(state));
}

function buildValidationObservation(action: string, result: JsonObject): string | undefined {
  if (action === "find" && Array.isArray(result.matches)) {
    return `Validated find result with ${result.matches.length} match(es).`;
  }

  const rawText =
    typeof result.result === "string"
      ? result.result
      : typeof result.markdown === "string"
        ? result.markdown
        : typeof result.message === "string"
          ? result.message
          : undefined;
  if (!rawText) {
    return undefined;
  }

  const normalized = normalizeText(rawText);
  return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
}

function buildEmptyTurnRecoveryPrompt(state: AgentRunState, pendingDialog?: NonNullable<ComputerBatchResult["javascript_dialog"]>): string {
  const instructions = [
    "Your previous turn returned no assistant text or tool calls after a successful tool result."
  ];

  if (state.lastValidatedObservation) {
    instructions.push(`Validated page observation: ${state.lastValidatedObservation}`);
  }

  if (pendingDialog) {
    instructions.push(
      `A JavaScript ${pendingDialog.type} dialog is open with message: ${pendingDialog.message}`
    );
    instructions.push("Your next step must resolve the dialog with a dialog tool call or explicitly abort.");
  } else {
    instructions.push("Reassess the validated page state and either issue the next tool call or answer directly.");
  }

  return instructions.join(" ");
}

function ensureResumeGate(state: AgentRunState): Promise<void> {
  if (state.resumeGate) {
    return state.resumeGate;
  }

  state.resumeGate = new Promise<void>((resolve) => {
    state.releaseResumeGate = () => {
      state.releaseResumeGate = null;
      state.resumeGate = undefined;
      resolve();
    };
  });

  return state.resumeGate;
}

function releaseResumeGate(state: AgentRunState): void {
  const release = state.releaseResumeGate;
  state.releaseResumeGate = null;
  state.resumeGate = undefined;
  release?.();
}

function createStoppedError(): Error & { code: string; retryable: boolean } {
  return Object.assign(new Error("Run stopped by user."), {
    code: "RUN_STOPPED",
    retryable: false
  });
}

function throwIfRunStopped(state: AgentRunState): void {
  if (state.abortController.signal.aborted) {
    throw createStoppedError();
  }
}

async function pauseAtBoundary(
  state: AgentRunState,
  memoryStore: AgentMemoryStore,
  onRunUpdated?: (state: AgentRunState) => void
): Promise<boolean> {
  if (!state.pauseRequested || state.abortController.signal.aborted) {
    return false;
  }

  ensureResumeGate(state);
  if (state.status !== "paused") {
    updateRunStatus(state, "paused", memoryStore, onRunUpdated);
  }

  await state.resumeGate;
  throwIfRunStopped(state);
  return true;
}

function injectResumeReassessmentMessage(state: AgentRunState, messages: ProviderRuntimeMessage[]): void {
  if (!state.resumeNeedsReassessment) {
    return;
  }

  messages.push({
    role: "user",
    content: RESUME_REASSESSMENT_PROMPT
  });
  state.resumeNeedsReassessment = false;
  state.resumeRequested = false;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function extractHistoryNavigationMode(value: string): "back" | "forward" | undefined {
  const normalized = normalizeText(value).toLowerCase().replace(/[.!?]+$/g, "");
  const backPattern =
    /^(?:(?:please|can you|could you|would you)\s+)?(?:(?:go|navigate|move)\s+)?back(?:\s+(?:in history|to(?: the)? previous page))?$/;
  const forwardPattern =
    /^(?:(?:please|can you|could you|would you)\s+)?(?:(?:go|navigate|move)\s+)?forward(?:\s+(?:in history|to(?: the)? next page))?$/;

  if (backPattern.test(normalized)) {
    return "back";
  }

  if (forwardPattern.test(normalized)) {
    return "forward";
  }

  return undefined;
}

function extractFirstUrl(value: string): string | undefined {
  const match = value.match(/https?:\/\/[^\s)]+/i);
  return match?.[0];
}

function sanitizeNavigationTarget(value: string): string {
  return value.trim().replace(/^[("'`]+|[)"'`.,!?;:]+$/g, "");
}

function isGenericNavigationTarget(value: string): boolean {
  return [
    "browser",
    "it",
    "page",
    "site",
    "tab",
    "that",
    "the page",
    "this"
  ].includes(value.toLowerCase());
}

function normalizeNavigationIntentUrl(target: string): string | undefined {
  const sanitized = sanitizeNavigationTarget(target);
  if (sanitized.length === 0) {
    return undefined;
  }

  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized;
  }

  if (sanitized.includes(" ")) {
    return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(sanitized) ? `https://${sanitized}` : undefined;
  }

  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(sanitized)) {
    return `https://${sanitized}`;
  }

  if (!/^[a-z0-9-]+$/i.test(sanitized) || isGenericNavigationTarget(sanitized)) {
    return undefined;
  }

  return `https://${sanitized}.com`;
}

function extractNavigationIntentUrl(value: string): string | undefined {
  const match = value.match(/\b(?:go to|navigate to|open|visit)\s+([^\n]+)/i);
  if (!match?.[1]) {
    return undefined;
  }

  return normalizeNavigationIntentUrl(match[1]);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function stripMarkdownFormatting(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, "$1")
    .replace(/\r/g, "")
    .trim();
}

function normaliseEmailDraftArtifact(payload: JsonObject): DraftArtifact {
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const bodyMarkdown = typeof payload.body_markdown === "string" ? payload.body_markdown.trim() : "";

  if (!subject || !bodyMarkdown) {
    throw Object.assign(new Error("draft_email requires non-empty subject and body_markdown."), {
      code: "INVALID_TOOL_CALL",
      retryable: false
    });
  }

  return {
    kind: "email",
    subject,
    body_markdown: bodyMarkdown,
    body_text: stripMarkdownFormatting(bodyMarkdown)
  };
}

function extractQuotedValue(value: string): string | undefined {
  const match = value.match(/"([^"\n]+)"|'([^'\n]+)'/);
  const nextValue = match?.[1] ?? match?.[2];
  if (!nextValue) {
    return undefined;
  }

  const normalized = nextValue.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function hasFormTarget(value: string): boolean {
  return includesAny(value, [
    "field",
    "input",
    "checkbox",
    "dropdown",
    "box",
    "toggle",
    "email",
    "username",
    "user name",
    "password",
    "name",
    "search",
    "address",
    "phone",
    "country"
  ]);
}

function hasFormActionVerb(value: string): boolean {
  return includesAny(value, ["enter", "type", "fill", "select", "check", "tick", "enable", "uncheck", "untick", "disable"]);
}

function hasCurrentPageCue(value: string): boolean {
  return includesAny(value, [
    "this page",
    "current page",
    "on this page",
    "this site",
    "on this site",
    "current site",
    "current tab",
    "this tab",
    "here"
  ]);
}

function hasExplicitWebResearchIntent(value: string): boolean {
  return includesAny(value, [
    "search the web",
    "search web",
    "search online",
    "look up",
    "lookup",
    "research",
    "internet",
    "online",
    "latest",
    "news",
    "documentation",
    "docs",
    "official docs",
    "official documentation",
    "source",
    "sources",
    "cite",
    "citation"
  ]);
}

function isClickIntent(value: string): boolean {
  const normalized = normalizeText(value).toLowerCase();
  const hasExplicitUiTarget = includesAny(normalized, ["button", "link", "element", "selector", "menu"]);

  if (/\b(?:click|tap)\b(?:\s+(?:on|the|a|an|my))?\s+\S+/.test(normalized)) {
    return true;
  }

  return includesAny(normalized, ["press"]) && hasExplicitUiTarget;
}

function extractFormInputPlan(prompt: string): { kind: "text" | "checkbox"; value: string | boolean } | undefined {
  const lower = prompt.toLowerCase();

  if (includesAny(lower, ["uncheck", "untick", "disable"])) {
    return {
      kind: "checkbox",
      value: false
    };
  }

  if (includesAny(lower, ["check", "tick", "enable"])) {
    return {
      kind: "checkbox",
      value: true
    };
  }

  if (!includesAny(lower, ["enter", "type", "fill", "select"])) {
    return undefined;
  }

  const textValue = extractQuotedValue(prompt);
  if (!textValue) {
    return undefined;
  }

  return {
    kind: "text",
    value: textValue
  };
}

function shouldPreferCurrentTabExecution(prompt: string): boolean {
  const normalized = normalizeText(prompt).toLowerCase();

  if (hasCurrentPageCue(normalized)) {
    return true;
  }

  if (extractFirstUrl(prompt) || extractNavigationIntentUrl(prompt) || extractHistoryNavigationMode(prompt)) {
    return true;
  }

  if (hasFormTarget(normalized) || hasFormActionVerb(normalized) || isClickIntent(normalized)) {
    return true;
  }

  return includesAny(normalized, [
    "dropdown",
    "checkbox",
    "radio button",
    "file upload",
    "upload",
    "download",
    "alert",
    "prompt",
    "dialog",
    "modal",
    "hover",
    "drag",
    "drop",
    "scroll"
  ]);
}

function shouldDisableWebSearchForRun(prompt: string, tabId: string): boolean {
  if (tabId === "__system__") {
    return false;
  }

  const normalized = normalizeText(prompt).toLowerCase();
  if (hasCurrentPageCue(normalized)) {
    return true;
  }

  if (hasExplicitWebResearchIntent(normalized)) {
    return false;
  }

  return shouldPreferCurrentTabExecution(prompt);
}

function toJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return { value };
}

function hashPayload(payload: JsonObject): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function appendRecentSignature(history: string[], signature: string, maxLength = 12): void {
  history.push(signature);
  if (history.length > maxLength) {
    history.splice(0, history.length - maxLength);
  }
}

function countRecentSignatureMatches(history: string[], signature: string): number {
  let count = 0;
  for (const entry of history) {
    if (entry === signature) {
      count += 1;
    }
  }
  return count;
}

function isAlternatingSignatureLoop(history: string[], nextSignature: string): boolean {
  const sequence = [...history, nextSignature];
  if (sequence.length < 6) {
    return false;
  }

  const [a, b, c, d, e, f] = sequence.slice(-6);
  return a === c && c === e && b === d && d === f && a !== b;
}

function shouldBlockLoopingToolCall(history: string[], nextSignature: string): boolean {
  const recentWindow = history.slice(-9);
  const repeatedCount = countRecentSignatureMatches(recentWindow, nextSignature) + 1;
  if (repeatedCount >= 4) {
    return true;
  }

  return isAlternatingSignatureLoop(history, nextSignature);
}

function summarizeResult(result: JsonObject): JsonObject {
  const interactable = typeof result.interactable === "object" && result.interactable ? result.interactable : undefined;
  const summary: JsonObject = {};

  if (Array.isArray(result.results)) {
    summary.result_count = result.results.length;
  }
  if (Array.isArray(result.matches)) {
    summary.match_count = result.matches.length;
  }
  if (typeof result.text === "string") {
    summary.text_length = result.text.length;
    summary.truncated = result.truncated === true;
  }
  if (typeof result.url === "string") {
    summary.url = result.url;
  }
  if (typeof result.tab_id === "string") {
    summary.tab_id = result.tab_id;
  }
  if (typeof result.updated === "number") {
    summary.updated = result.updated;
  }
  if (interactable && Array.isArray((interactable as { tree?: unknown }).tree)) {
    summary.interactable_count = (interactable as { tree: unknown[] }).tree.length;
  }
  if (Array.isArray(result.steps)) {
    summary.completed_steps = result.completed_steps;
  }

  return Object.keys(summary).length > 0 ? summary : result;
}

function normalizeExecutorError(error: unknown): NormalizedExecutorError {
  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
    };

    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        message: candidate.message,
        retryable: candidate.retryable === true
      };
    }

    if (typeof candidate.message === "string") {
      return {
        code: "INTERNAL_ERROR",
        message: candidate.message,
        retryable: false
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message,
      retryable: false
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected executor failure",
    retryable: false
  };
}

function progressTodos(todos: TodoItem[], activeIndex: number | null): TodoItem[] {
  return todos.map((todo, todoIndex) => {
    if (activeIndex !== null && todoIndex < activeIndex) {
      return {
        ...todo,
        status: "completed" as const,
        active_form: undefined
      };
    }

    if (activeIndex !== null && todoIndex === activeIndex) {
      return {
        ...todo,
        status: "in_progress" as const,
        active_form: `${todo.content}...`
      };
    }

    return {
      ...todo,
      status: "pending" as const,
      active_form: undefined
    };
  });
}

function completedTodos(todos: TodoItem[]): TodoItem[] {
  return todos.map((todo) => ({
    ...todo,
    status: "completed" as const,
    active_form: undefined
  }));
}

function buildPlanSummary(steps: PlannedToolStep[]): string {
  if (steps.length === 0) {
    return "No executable tool steps were derived from the prompt.";
  }

  return `Planned ${steps.length} tool step(s): ${steps.map((step) => step.action).join(", ")}.`;
}

function pushUniqueSource(target: SourceAttribution[], source: SourceAttribution): void {
  if (target.some((existing) => existing.id === source.id)) {
    return;
  }

  target.push(source);
}

function parseSearchResultSources(result: Record<string, unknown>): SourceAttribution[] {
  const rawResults = Array.isArray(result.results) ? result.results : [];
  const sources: SourceAttribution[] = [];

  for (const item of rawResults) {
    if (!isRecord(item)) {
      continue;
    }

    const rawId = typeof item.id === "string" ? item.id.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!/^web:\d+$/.test(rawId) || !url) {
      continue;
    }

    const title = typeof item.title === "string" ? item.title.trim() : "";
    sources.push({
      id: `[${rawId}]`,
      origin: "web",
      action: "search_web",
      ...(title ? { title, label: title } : {}),
      url
    });
  }

  return sources;
}

function extractCitationIndex(sourceId: string): number | undefined {
  const match = sourceId.match(/^\[web:(\d+)\]$/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isInspectionStep(action: string): boolean {
  return action === "read_page" || action === "get_page_text";
}

function needsInspectionPrelude(action: string): boolean {
  return action === "find" || action === "form_input" || action === "computer";
}

function isStructuredInspectionAction(action: string): boolean {
  return action === "read_page" || action === "find";
}

function isPostActionValidationAction(action: string): boolean {
  return action === "read_page" || action === "find" || action === "get_page_text";
}

function countStateChangingComputerSteps(payload: JsonObject): number {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  let count = 0;

  for (const rawStep of steps) {
    if (!isRecord(rawStep)) {
      continue;
    }

    const kind = typeof rawStep.kind === "string" ? normalizeText(rawStep.kind).toLowerCase() : "";
    if (kind === "click" || kind === "type" || kind === "key" || kind === "drag" || kind === "dialog") {
      count += 1;
    }
  }

  return count;
}

function hasMultipleStateChangingComputerSteps(payload: JsonObject): boolean {
  return countStateChangingComputerSteps(payload) > 1;
}

function requiresValidationAfterPageAction(action: string, payload: JsonObject, result: JsonObject): boolean {
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

function hasCoordinateDrivenComputerInteraction(payload: JsonObject): boolean {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  for (const rawStep of steps) {
    if (!isRecord(rawStep)) {
      continue;
    }

    const kind = typeof rawStep.kind === "string" ? normalizeText(rawStep.kind).toLowerCase() : "";
    if (kind === "click") {
      const hasCoordinates =
        (typeof rawStep.x === "number" && Number.isFinite(rawStep.x)) ||
        (typeof rawStep.y === "number" && Number.isFinite(rawStep.y));
      const hasRef = typeof rawStep.ref === "string" && rawStep.ref.trim().length > 0;
      if (hasCoordinates && !hasRef) {
        return true;
      }
      continue;
    }

    if (kind === "drag") {
      const hasCoordinates =
        (typeof rawStep.from_x === "number" && Number.isFinite(rawStep.from_x)) ||
        (typeof rawStep.from_y === "number" && Number.isFinite(rawStep.from_y)) ||
        (typeof rawStep.to_x === "number" && Number.isFinite(rawStep.to_x)) ||
        (typeof rawStep.to_y === "number" && Number.isFinite(rawStep.to_y));
      const hasRefs =
        typeof rawStep.from_ref === "string" &&
        rawStep.from_ref.trim().length > 0 &&
        typeof rawStep.to_ref === "string" &&
        rawStep.to_ref.trim().length > 0;
      if (hasCoordinates && !hasRefs) {
        return true;
      }
    }
  }

  return false;
}

function requiresStructuredInspectionAfterNavigation(action: string, payload: JsonObject): boolean {
  if (action === "form_input") {
    return true;
  }

  if (action !== "computer") {
    return false;
  }

  return hasCoordinateDrivenComputerInteraction(payload);
}

function injectInspectionSteps(
  steps: PlannedToolStep[],
  available: Set<string>,
  policy: PromptPolicy
): PlannedToolStep[] {
  if (!policy.inspectBeforeInteractiveActions || !policy.preferReadPageForInspection || !available.has("read_page")) {
    return steps;
  }

  const nextSteps: PlannedToolStep[] = [];

  for (const step of steps) {
    const previous = nextSteps[nextSteps.length - 1];
    if (
      step.tabScope === "active_tab" &&
      needsInspectionPrelude(step.action) &&
      (!previous || previous.tabScope !== "active_tab" || !isInspectionStep(previous.action))
    ) {
      nextSteps.push({
        id: `step-${nextSteps.length + 1}`,
        action: "read_page",
        description: "Inspect the current page before interactive actions",
        tabScope: "active_tab",
        params: {}
      });
    }

    nextSteps.push({
      ...step,
      id: `step-${nextSteps.length + 1}`
    });
  }

  return nextSteps;
}

function createPlannerAgent(): PlannerAgent {
  return {
    plan(params: AgentRunParams, specs: PromptSpecs) {
      const available = new Set<string>((specs.toolNames.length > 0 ? specs.toolNames : [...KNOWN_TOOL_NAMES]).map((value) => value.toLowerCase()));
      const policy = specs.policy;
      const prompt = normalizeText(params.prompt);
      const lower = prompt.toLowerCase();
      const isNewTabIntent = includesAny(lower, ["new tab", "open tab", "another tab"]);
      const historyNavigationMode = extractHistoryNavigationMode(prompt);
      const shouldResolveFormTarget = hasFormTarget(lower) && hasFormActionVerb(lower);
      const formInputPlan = shouldResolveFormTarget ? extractFormInputPlan(prompt) : undefined;
      const clickIntent = !formInputPlan && isClickIntent(lower);
      const explicitUrl = extractFirstUrl(prompt);
      const navigationUrl = explicitUrl ?? extractNavigationIntentUrl(prompt);
      const steps: PlannedToolStep[] = [];

      const pushStep = (
        action: string,
        description: string,
        tabScope: PlannedToolStep["tabScope"],
        stepParams: JsonObject,
        binding?: PlannedToolBinding
      ): void => {
        if (!available.has(action)) {
          return;
        }

        const step: PlannedToolStep = {
          id: `step-${steps.length + 1}`,
          action,
          description,
          tabScope,
          params: stepParams,
          binding
        };

        steps.push(step);
      };

      if (isNewTabIntent) {
        pushStep(
          "tabs_create",
          navigationUrl ? `Create a new tab at ${navigationUrl}` : "Create a new browser tab",
          "active_tab",
          navigationUrl ? { url: navigationUrl } : {}
        );
      }

      if (historyNavigationMode && !isNewTabIntent) {
        pushStep(
          "navigate",
          historyNavigationMode === "back" ? "Go back in the current tab" : "Go forward in the current tab",
          "active_tab",
          {
            mode: historyNavigationMode
          }
        );
      } else if (navigationUrl && !isNewTabIntent) {
        pushStep(
          "navigate",
          `Navigate to ${navigationUrl}`,
          "active_tab",
          {
            mode: "to",
            url: navigationUrl
          }
        );
      } else if (policy.preferSearchWebForGeneralSearch && includesAny(lower, ["search", "look up", "lookup", "research"])) {
        pushStep(
          "search_web",
          "Search the web for relevant context",
          "system",
          {
            queries: [truncate(prompt, 180)]
          }
        );
      }

      if (formInputPlan) {
        pushStep(
          "find",
          "Find relevant interactive elements on the current page",
          "active_tab",
          {
            query: truncate(prompt, 180),
            limit: 20
          }
        );
        pushStep(
          "form_input",
          "Fill the best matching form field",
          "active_tab",
          {
            fields: [{ ref: "__BOUND__", kind: formInputPlan.kind, value: formInputPlan.value }]
          },
          {
            source: "latest_find_match",
            matchIndex: 0,
            mode: "form_input"
          }
        );
      } else if (clickIntent) {
        pushStep(
          "find",
          "Find relevant interactive elements on the current page",
          "active_tab",
          {
            query: truncate(prompt, 180),
            limit: 20
          }
        );
        pushStep(
          "computer",
          "Click the best matching interactive element",
          "active_tab",
          {
            steps: [{ kind: "click" }]
          },
          {
            source: "latest_find_match",
            matchIndex: 0,
            mode: "click"
          }
        );
      } else if (shouldResolveFormTarget || includesAny(lower, ["find", "button", "field", "link", "input", "element", "selector"])) {
        pushStep(
          "find",
          "Find relevant interactive elements on the current page",
          "active_tab",
          {
            query: truncate(prompt, 180),
            limit: 20
          }
        );
      }

      if (includesAny(lower, ["read", "summarize", "summarise", "extract", "text", "content", "analyze"])) {
        pushStep("read_page", "Read the page structure", "active_tab", {});
        if (policy.preferGetPageTextForLongReading) {
          pushStep(
            "get_page_text",
            "Extract page text content",
            "active_tab",
            {
              max_chars: 20_000
            }
          );
        }
      }

      if (steps.length === 0) {
        if (available.has("read_page")) {
          pushStep("read_page", "Inspect the current page", "active_tab", {});
        } else if (available.has("search_web")) {
          pushStep(
            "search_web",
            "Search the web for the requested task",
            "system",
            {
              queries: [truncate(prompt, 180)]
            }
          );
        }
      }

      const policySteps = injectInspectionSteps(steps, available, policy);
      const deduped: PlannedToolStep[] = [];
      const seen = new Set<string>();
      for (const step of policySteps) {
        const signature = `${step.action}:${JSON.stringify(step.params)}:${step.tabScope}:${JSON.stringify(step.binding ?? null)}`;
        if (seen.has(signature)) {
          continue;
        }
        seen.add(signature);
        deduped.push({
          ...step,
          id: `step-${deduped.length + 1}`
        });
      }

      const todos: TodoItem[] =
        deduped.length > 0
          ? deduped.map((step, index) => ({
              content: step.description,
              status: index === 0 ? "in_progress" : "pending",
              active_form: index === 0 ? `${step.description}...` : undefined
            }))
          : [
              {
                content: "Analyze request and prepare next action",
                status: "in_progress",
                active_form: "Analyzing request..."
              }
            ];

      return {
        todos,
        steps: deduped,
        summary: buildPlanSummary(deduped)
      };
    }
  };
}

function extractFindMatches(result: JsonObject): FindMatch[] {
  const rawMatches = result.matches;
  if (!Array.isArray(rawMatches)) {
    return [];
  }

  const matches: FindMatch[] = [];
  for (const rawMatch of rawMatches) {
    if (!isRecord(rawMatch) || typeof rawMatch.ref !== "string" || typeof rawMatch.score !== "number") {
      continue;
    }

    const coordinates =
      isRecord(rawMatch.coordinates) &&
      typeof rawMatch.coordinates.x === "number" &&
      Number.isFinite(rawMatch.coordinates.x) &&
      typeof rawMatch.coordinates.y === "number" &&
      Number.isFinite(rawMatch.coordinates.y)
        ? {
            x: rawMatch.coordinates.x,
            y: rawMatch.coordinates.y
          }
        : undefined;

    matches.push({
      ref: rawMatch.ref,
      text: typeof rawMatch.text === "string" ? rawMatch.text : undefined,
      role: typeof rawMatch.role === "string" ? rawMatch.role : undefined,
      score: rawMatch.score,
      coordinates
    });
  }

  return matches;
}

function createBlockedInteractionError(): Error {
  return Object.assign(new Error("No matching interactive element was available for the planned action."), {
    code: "REQUEST_BLOCKED",
    retryable: false
  });
}

function resolveBoundStepParams(step: PlannedToolStep, latestFindMatches: FindMatch[]): JsonObject {
  if (!step.binding) {
    return step.params;
  }

  const match = latestFindMatches[step.binding.matchIndex];
  if (!match) {
    throw createBlockedInteractionError();
  }

  if (step.binding.mode === "click") {
    if (match.ref) {
      return {
        steps: [{ kind: "click", ref: match.ref }]
      };
    }

    if (match.coordinates) {
      return {
        steps: [{ kind: "click", x: match.coordinates.x, y: match.coordinates.y }]
      };
    }

    throw createBlockedInteractionError();
  }

  if (!match.ref) {
    throw createBlockedInteractionError();
  }

  const rawFields = step.params.fields;
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    throw new Error("Planned form input payload was invalid.");
  }

  const fields = rawFields.map((rawField) => {
    if (!isRecord(rawField) || typeof rawField.kind !== "string" || !("value" in rawField)) {
      throw new Error("Planned form input payload was invalid.");
    }

    return {
      ref: match.ref,
      kind: rawField.kind,
      value: rawField.value
    };
  });

  return { fields };
}

function createExecutorAgent(performAction: OrchestratorOptions["performAction"], policy: PromptPolicy): ExecutorAgent {
  return {
    async execute(params) {
      const boundedSteps = params.steps.slice(0, params.maxSteps);
      const boundedTodos = params.todos.slice(0, Math.max(1, boundedSteps.length));
      let executedSteps = 0;
      let lastResult: JsonObject | undefined;
      let latestFindMatches: FindMatch[] = [];
      const availableCitations: string[] = [];
      let webCitationIndex = 0;
      let screenshotCitationIndex = 0;
      let pendingJavaScriptDialog: ComputerBatchResult["javascript_dialog"] | undefined;

      if (policy.requireFrequentTodoTracking) {
        await performAction(
          "todo_write",
          params.tabId,
          {
            todos: progressTodos(boundedTodos, boundedSteps.length > 0 ? 0 : null)
          },
          params.signal
        );
      }

      for (let index = 0; index < boundedSteps.length; index += 1) {
        if (params.signal.aborted) {
          throw Object.assign(new Error("Run aborted"), {
            code: "REQUEST_ABORTED",
            retryable: true
          });
        }

        const step = boundedSteps[index];
        let payload = redactSensitiveJson(step.params) ?? {};
        let inputHash = hashPayload(payload);

        if (policy.requireFrequentTodoTracking) {
          await performAction(
            "todo_write",
            params.tabId,
            {
              todos: progressTodos(boundedTodos, Math.min(index, boundedTodos.length - 1))
            },
            params.signal
          );
        }

        try {
          const requestParams = resolveBoundStepParams(step, latestFindMatches);
          payload = redactSensitiveJson(requestParams) ?? {};
          inputHash = hashPayload(payload);

          params.onStep({
            status: "started",
            step,
            index,
            inputHash,
            payload
          });

          const requestTabId = step.tabScope === "system" ? "__system__" : params.tabId;
          const rawResult = await performAction(step.action, requestTabId, requestParams, params.signal);
          const result = redactSensitiveJson(toJsonObject(rawResult)) ?? {};
          lastResult = summarizeResult(result);
          if (step.action === "find") {
            latestFindMatches = extractFindMatches(result);
          }
          if (step.action === "read_page" || step.action === "get_page_text" || step.action === "find" || step.action === "search_web") {
            webCitationIndex += 1;
            const citation = `[web:${webCitationIndex}]`;
            availableCitations.push(citation);
            params.onStep({
              status: "completed",
              step,
              index,
              inputHash,
              payload,
              result: lastResult,
              source: {
                id: citation,
                origin: "web",
                action: step.action
              }
            });
            executedSteps += 1;
            continue;
          } else if (step.action === "computer" && typeof result.screenshot_b64 === "string") {
            screenshotCitationIndex += 1;
            const citation = `[screenshot:${screenshotCitationIndex}]`;
            availableCitations.push(citation);
            params.onStep({
              status: "completed",
              step,
              index,
              inputHash,
              payload,
              result: lastResult,
              source: {
                id: citation,
                origin: "screenshot",
                action: step.action
              }
            });
            executedSteps += 1;
            continue;
          }
          executedSteps += 1;

          params.onStep({
            status: "completed",
            step,
            index,
            inputHash,
            payload,
            result: lastResult
          });
        } catch (error) {
          const normalized = normalizeExecutorError(error);
          params.onStep({
            status: "failed",
            step,
            index,
            inputHash,
            payload,
            errorCode: normalized.code,
            errorMessage: normalized.message
          });
          throw Object.assign(new Error(normalized.message), {
            code: normalized.code,
            retryable: normalized.retryable
          });
        }
      }

      if (policy.requireFrequentTodoTracking) {
        await performAction(
          "todo_write",
          params.tabId,
          {
            todos: completedTodos(boundedTodos)
          },
          params.signal
        );
      }

      if (executedSteps === 0) {
        return {
          executedSteps,
          finalAnswer: buildValidatedFinalAnswer({
            userPrompt: params.userPrompt,
            executedSteps,
            availableCitations,
            hasImageInput: params.hasImageInput
          }).text
        };
      }

      const validated = buildValidatedFinalAnswer({
        userPrompt: params.userPrompt,
        executedSteps,
        lastResult,
        availableCitations,
        hasImageInput: params.hasImageInput
      });

      return {
        executedSteps,
        finalAnswer: validated.text
      };
    }
  };
}

function appendStep(
  state: AgentRunState,
  step: AgentRunState["steps"][number],
  memoryStore: AgentMemoryStore,
  onRunUpdated?: (state: AgentRunState) => void
): void {
  state.steps.push(step);
  state.updatedAt = nowIso();
  memoryStore.upsert(state.runId, {
    status: state.status,
    steps: state.steps
  });
  onRunUpdated?.(cloneState(state));
}

function emitToolEvent(
  state: AgentRunState,
  onToolEvent: OrchestratorOptions["onToolEvent"],
  event: AgentToolEvent
): void {
  if (state.visibility !== "panel") {
    return;
  }

  onToolEvent?.(event);
}

export async function createOrchestrator(options: OrchestratorOptions): Promise<AgentOrchestrator> {
  const memoryStore = options.memoryStore ?? createMemoryStore();
  const promptSpecs = options.promptSpecs ?? (await loadPromptSpecs(options.promptLoader));
  const providerRegistry = options.providerRegistry ?? createProviderRegistry();
  const taskManager = createTaskManager();
  const defaultMaxSteps =
    typeof options.defaultMaxSteps === "number" && Number.isFinite(options.defaultMaxSteps) && options.defaultMaxSteps > 0
      ? Math.floor(options.defaultMaxSteps)
      : 25;

  const publishTaskUpdate = (state: AgentRunState): void => {
    options.onRunUpdated?.(cloneState(state));
  };

  const writeParentTaskPatch = (parent: AgentRunState): void => {
    memoryStore.upsert(parent.runId, {
      status: parent.status,
      task: buildTaskState(parent) as unknown as JsonObject
    });
    publishTaskUpdate(parent);
  };

  const finalizeChildTask = (state: AgentRunState): void => {
    if (!state.parentTaskId) {
      return;
    }

    const error = state.status === "completed"
      ? undefined
      : {
          code: state.status === "stopped" ? "SUBAGENT_CANCELED" : "SUBAGENT_FAILED",
          message: state.errorMessage ?? "Subagent task failed."
        };
    const parent = error
      ? taskManager.failChild(state.taskId, error)
      : taskManager.completeChild(state.taskId, state.finalAnswer);
    if (parent) {
      writeParentTaskPatch(parent);
    }
  };

  const stopChildTask = (child: AgentRunState, error: AgentTaskError): void => {
    if (child.status !== "running" && child.status !== "pausing" && child.status !== "paused") {
      const parent = taskManager.cancelChild(child.taskId, error);
      if (parent) {
        writeParentTaskPatch(parent);
      }
      return;
    }

    child.pauseRequested = false;
    child.resumeRequested = false;
    child.resumeNeedsReassessment = false;
    child.abortController.abort();
    releaseResumeGate(child);
    updateRunStatus(child, "stopped", memoryStore, undefined, {
      error_message: error.message
    });
    child.errorMessage = error.message;
    const parent = taskManager.cancelChild(child.taskId, error);
    if (parent) {
      writeParentTaskPatch(parent);
    }
  };

  const executeRun = async (state: AgentRunState): Promise<void> => {
    const policy = promptSpecs.policy;
    const maxSteps =
      typeof state.params.max_steps === "number" && Number.isFinite(state.params.max_steps) && state.params.max_steps > 0
        ? Math.floor(state.params.max_steps)
        : defaultMaxSteps;
    const maxActionsPerStep =
      typeof state.params.max_actions_per_step === "number" && Number.isFinite(state.params.max_actions_per_step) && state.params.max_actions_per_step > 0
        ? Math.floor(state.params.max_actions_per_step)
        : 10;
    const failureTolerance =
      typeof state.params.failure_tolerance === "number" && Number.isFinite(state.params.failure_tolerance) && state.params.failure_tolerance >= 0
        ? Math.floor(state.params.failure_tolerance)
        : 3;
    const enableVision = state.params.enable_vision === true;
    const replanningFrequency =
      typeof state.params.replanning_frequency === "number" && Number.isFinite(state.params.replanning_frequency) && state.params.replanning_frequency > 0
        ? Math.floor(state.params.replanning_frequency)
        : 0;
    const pageLoadWaitMs =
      typeof state.params.page_load_wait_ms === "number" && Number.isFinite(state.params.page_load_wait_ms) && state.params.page_load_wait_ms >= 0
        ? Math.floor(state.params.page_load_wait_ms)
        : 250;
    const thinkingLevel: ProviderThinkingLevel =
      (["minimal", "low", "medium", "high"] as const).includes(state.params.thinking_level as ProviderThinkingLevel)
        ? (state.params.thinking_level as ProviderThinkingLevel)
        : "high";
    const funcCallingEnabled = state.params.enable_function_calling !== false;
    const browseSearchEnabled = state.params.allow_browser_search !== false;
    const codeExecEnabled = state.params.enable_code_execution === true;
    const tabId = state.params.tab_id ?? options.resolveDefaultTabId() ?? "__system__";
    const searchWebSuppressedForRun = shouldDisableWebSearchForRun(state.params.prompt, tabId);
    const apiKey = typeof state.params.api_key === "string" ? state.params.api_key.trim() : "";
    const model = typeof state.params.model === "string" ? state.params.model.trim() : "";

    try {
      if (!apiKey) {
        throw Object.assign(new Error("Provider API key required for AgentRun."), {
          code: "PROVIDER_AUTH_REQUIRED",
          retryable: false
        });
      }

      if (!model) {
        throw Object.assign(new Error("A model is required for AgentRun."), {
          code: "INVALID_REQUEST",
          retryable: false
        });
      }

      if (typeof providerRegistry.runTurn !== "function") {
        throw Object.assign(new Error(`Provider runtime is not configured for ${state.params.provider}.`), {
          code: "PROVIDER_UNAVAILABLE",
          retryable: true
        });
      }

      const fullToolCatalog = buildToolSchemaCatalog(promptSpecs.toolNames);
      const toolingMismatches = findToolCatalogMismatches(promptSpecs.declaredTools, fullToolCatalog);
      if (toolingMismatches.length > 0) {
        throw Object.assign(new Error(`Tool definitions from REF DOCS mismatch sidecar implementation: ${toolingMismatches.join(", ")}`), {
          code: "TOOLING_MISMATCH",
          retryable: false
        });
      }

      let toolCatalog = fullToolCatalog.filter((tool) => tool.name !== "todo_write");
      if (!shouldExposeTabManagementTool(state.params.prompt)) {
        toolCatalog = toolCatalog.filter((tool) => tool.name !== "tabs_create");
      }
      if (!funcCallingEnabled) {
        toolCatalog = [];
      } else if (!browseSearchEnabled || searchWebSuppressedForRun) {
        toolCatalog = toolCatalog.filter((tool) => tool.name !== "search_web");
      }
      const todoWriteFallbackTool = funcCallingEnabled ? fullToolCatalog.find((tool) => tool.name === "todo_write") : undefined;
      const availableToolNames = toolCatalog.map((tool) => tool.name);

      appendStep(
        state,
        {
          ts: nowIso(),
          phase: "planner",
          action: "plan",
          status: "started"
        },
        memoryStore,
        options.onRunUpdated
      );

      appendStep(
        state,
        {
          ts: nowIso(),
          phase: "planner",
          action: "plan",
          status: "completed",
          details: {
            tool_count: toolCatalog.length,
            summary: `Provider tool loop ready with ${toolCatalog.length} tool(s).`,
            available_tools: availableToolNames
          }
        },
        memoryStore,
        options.onRunUpdated
      );

      appendStep(
        state,
        {
          ts: nowIso(),
          phase: "executor",
          action: "execute",
          status: "started",
          details: {
            max_steps: maxSteps
          }
        },
        memoryStore,
        options.onRunUpdated
      );

      const userImages = Array.isArray(state.params.images) && state.params.images.length > 0
        ? state.params.images
        : null;

      const userContent: ProviderRuntimeMessage["content"] = userImages
        ? [
            { type: "text" as const, text: state.params.prompt },
            ...userImages.map((dataUrl): ProviderImagePart => {
              const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
              const mediaType = (m?.[1] ?? "image/png") as "image/png" | "image/jpeg" | "image/webp";
              const data = m?.[2] ?? dataUrl;
              return { type: "image", media_type: mediaType, data };
            })
          ]
        : state.params.prompt;

      const messages: ProviderRuntimeMessage[] = [
        { role: "system", content: promptSpecs.systemPrompt },
        ...buildObservationResponseInstruction(state.params.prompt, state.hasImageInput),
        ...buildConversationHistoryMessages(state.params),
        { role: "user", content: userContent }
      ];

      let executedSteps = 0;
      let webCitationIndex = 0;
      let screenshotCitationIndex = 0;
      let lastResult: JsonObject | undefined;
      const recentToolSignatures: string[] = [];
      let loopGuardTrips = 0;
      let consecutiveFailures = 0;
      let needsPageLoadWait = false;
      let needsStructuredInspectionAfterNavigation = false;
      let needsPostActionValidation = false;
      let postActionValidationReminderTrips = 0;
      let emptyProviderTurnRetries = 0;
      let pendingJavaScriptDialog: ComputerBatchResult["javascript_dialog"] | undefined;
      let forceFunctionCallingContinuation = false;

      const completeRun = (answer: string, details: JsonObject): void => {
        if (state.role === "primary" && state.activeChildTaskId) {
          const child = taskManager.getByTaskId(state.activeChildTaskId);
          if (child) {
            stopChildTask(child, {
              code: "SUBAGENT_CANCELED",
              message: "Child task stopped because the parent task completed."
            });
          }
        }
        state.finalAnswer = answer;
        appendStep(
          state,
          {
            ts: nowIso(),
            phase: "executor",
            action: "execute",
            status: "completed",
            details
          },
          memoryStore,
          options.onRunUpdated
        );
        updateRunStatus(state, "completed", memoryStore, options.onRunUpdated, {
          final_answer: state.finalAnswer,
          task: buildTaskState(state) as unknown as JsonObject,
          ...(state.draftArtifact ? { draft_artifact: state.draftArtifact as unknown as JsonObject } : {})
        });
        if (state.role === "subagent") {
          finalizeChildTask(state);
        }
      };

      outer: while (executedSteps < maxSteps) {
        if (await pauseAtBoundary(state, memoryStore, options.onRunUpdated)) {
          continue;
        }

        if (needsPageLoadWait && pageLoadWaitMs > 0) {
          needsPageLoadWait = false;
          await delay(pageLoadWaitMs);
        }

        injectResumeReassessmentMessage(state, messages);
        const turn = await providerRegistry.runTurn(state.params.provider, {
          apiKey,
          baseUrl: state.params.base_url,
          model,
          messages,
          tools: toolCatalog.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          })),
          thinkingLevel: thinkingLevel,
          functionCallingMode:
            funcCallingEnabled && availableToolNames.length > 0
              ? ((pendingJavaScriptDialog || forceFunctionCallingContinuation) ? "ANY" : "VALIDATED")
              : "NONE",
          allowBrowserSearch: browseSearchEnabled && !searchWebSuppressedForRun && availableToolNames.includes("search_web"),
          allowCodeExecution: codeExecEnabled,
          preferVision: state.hasImageInput || enableVision,
          signal: state.abortController.signal
        });
        throwIfRunStopped(state);

        if (await pauseAtBoundary(state, memoryStore, options.onRunUpdated)) {
          continue;
        }

        if (Array.isArray(turn.toolCalls) && turn.toolCalls.length > 0) {
          emptyProviderTurnRetries = 0;
          forceFunctionCallingContinuation = false;
          // Record the assistant turn (with its tool calls) so providers that
          // need the full conversation history (e.g. Gemini functionCall /
          // functionResponse pairs) can reconstruct it correctly.
          messages.push({
            role: "assistant",
            content: turn.assistantText ?? "",
            provider_parts: turn.provider_parts,
            tool_calls: turn.toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments
            }))
          });

          let actionsThisTurn = 0;
          for (const toolCall of turn.toolCalls) {
            if (executedSteps >= maxSteps) {
              break;
            }

            const action = normalizeText(toolCall.name).toLowerCase();
            const tool =
              toolCatalog.find((entry) => entry.name === action) ??
              (action === "todo_write" ? todoWriteFallbackTool : undefined);
            if (!tool) {
              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps + 1,
                    error_code: "INVALID_TOOL_CALL",
                    error_message: `Unsupported tool: ${toolCall.name}`
                  }
                },
                memoryStore,
                options.onRunUpdated
              );
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "INVALID_TOOL_CALL",
                  error_message: `Unsupported tool: ${toolCall.name}`
                })
              });
              executedSteps += 1;
              continue;
            }

            const payload = redactSensitiveJson(toolCall.arguments) ?? {};
            const inputHash = hashPayload(payload);
            const requestTabId = tool.tabScope === "system" ? "__system__" : tabId;
            const toolSignature = `${action}:${inputHash}`;

            if (
              needsStructuredInspectionAfterNavigation &&
              !isStructuredInspectionAction(action) &&
              requiresStructuredInspectionAfterNavigation(action, payload)
            ) {
              const inspectionMessage =
                "Call read_page (prefer filter: \"interactive\") or find after navigation before using coordinate-based interactions on the new page.";
              appendRecentSignature(recentToolSignatures, toolSignature);
              executedSteps += 1;

              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    error_code: "NAVIGATION_INSPECTION_REQUIRED",
                    error_message: inspectionMessage
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "NAVIGATION_INSPECTION_REQUIRED",
                  error_message: inspectionMessage
                })
              });
              continue;
            }

            if (policy.requireSingleStateChangingComputerAction && action === "computer" && hasMultipleStateChangingComputerSteps(payload)) {
              const validationMessage =
                "Perform only one state-changing computer action per tool call. After it completes, validate the page state with read_page, find, or get_page_text before continuing.";
              appendRecentSignature(recentToolSignatures, toolSignature);
              executedSteps += 1;

              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    error_code: "ACTION_VALIDATION_REQUIRED",
                    error_message: validationMessage
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "ACTION_VALIDATION_REQUIRED",
                  error_message: validationMessage
                })
              });
              continue;
            }

            if (
              policy.requireValidationAfterPageActions &&
              needsPostActionValidation &&
              !isPostActionValidationAction(action) &&
              requiresValidationAfterPageAction(action, payload, {})
            ) {
              const validationMessage =
                "Validate the result of your most recent page interaction with read_page, find, or get_page_text before taking another state-changing action.";
              appendRecentSignature(recentToolSignatures, toolSignature);
              executedSteps += 1;

              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    error_code: "ACTION_VALIDATION_REQUIRED",
                    error_message: validationMessage
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "ACTION_VALIDATION_REQUIRED",
                  error_message: validationMessage
                })
              });
              continue;
            }

            const isRequiredValidationAction =
              policy.requireValidationAfterPageActions &&
              needsPostActionValidation &&
              isPostActionValidationAction(action);

            if (!isRequiredValidationAction && shouldBlockLoopingToolCall(recentToolSignatures, toolSignature)) {
              const loopMessage = "Repeated tool pattern detected. Stop repeating this action and either choose a different tool or provide the final answer using gathered evidence.";
              loopGuardTrips += 1;
              appendRecentSignature(recentToolSignatures, toolSignature);
              executedSteps += 1;

              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    error_code: "LOOP_GUARD",
                    error_message: loopMessage
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "LOOP_GUARD",
                  error_message: loopMessage
                })
              });

              if (loopGuardTrips >= 3) {
                const availableCitations = state.sources
                  .map((source) => source.id)
                  .filter((id) => /^\[(?:web|screenshot):\d+\]$/.test(id));
                let forcedFinalAnswer: string | undefined;
                try {
                  const forcedTurn = await providerRegistry.runTurn(state.params.provider, {
                    apiKey,
                    baseUrl: state.params.base_url,
                    model,
                    messages: [
                      ...messages,
                      {
                        role: "user",
                        content:
                          "Tool loop guard triggered. Stop calling tools and provide the final answer now using the evidence already gathered. Include inline citations."
                      }
                    ],
                    tools: [],
                    thinkingLevel: "high",
                    allowBrowserSearch: false,
                    allowCodeExecution: false,
                    preferVision: state.hasImageInput,
                    signal: state.abortController.signal
                  });

                  if (
                    typeof forcedTurn.assistantText === "string" &&
                    forcedTurn.assistantText.trim().length > 0 &&
                    (!Array.isArray(forcedTurn.toolCalls) || forcedTurn.toolCalls.length === 0)
                  ) {
                    const forcedValidation = validateFinalAnswerWithAutofix({
                      userPrompt: state.params.prompt,
                      text: forcedTurn.assistantText,
                      availableCitations,
                      hasImageInput: state.hasImageInput
                    });
                    if (forcedValidation.ok) {
                      forcedFinalAnswer = forcedValidation.normalized_text;
                    }
                  }
                } catch {
                  // Fall back to deterministic summary below.
                }

                const fallbackAnswer = forcedFinalAnswer ?? buildValidatedFinalAnswer({
                  userPrompt: state.params.prompt,
                  executedSteps,
                  lastResult,
                  availableCitations,
                  hasImageInput: state.hasImageInput
                }).text;
                completeRun(fallbackAnswer, {
                  executed_steps: executedSteps,
                  completed_via: forcedFinalAnswer ? "loop_guard_forced_final" : "loop_guard"
                });
                return;
              }

              continue;
            }

            appendRecentSignature(recentToolSignatures, toolSignature);
            actionsThisTurn += 1;

            if (actionsThisTurn > maxActionsPerStep) {
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: "MAX_ACTIONS_PER_STEP",
                  error_message: `Max actions per step (${maxActionsPerStep}) reached. Provide your final answer using evidence gathered so far.`
                })
              });
              executedSteps += 1;
              continue;
            }

            appendStep(
              state,
              {
                ts: nowIso(),
                phase: "executor",
                action,
                status: "started",
                details: {
                  step_id: toolCall.id,
                  step_index: executedSteps + 1,
                  description: `Execute ${toolCall.name}`,
                  input_hash: inputHash,
                  payload
                }
              },
              memoryStore,
              options.onRunUpdated
            );

            // Emit tool_start SSE so the panel UI can show the action item
            // Comet RUM: includes step_type (= tool name) and operation_key for observability
            emitToolEvent(state, options.onToolEvent, {
              type: "tool_start",
              run_id: state.runId,
              tool_name: action,
              step_type: action,            // Comet: e.stepType
              operation_key: toolCall.id,   // Comet: e.operationKey
              tool_call_id: toolCall.id,
              tool_input: toolCall.arguments
            });

            try {
              const result =
                action === "draft_email"
                  ? (normaliseEmailDraftArtifact(payload) as unknown as JsonObject)
                  : (redactSensitiveJson(
                      toJsonObject(await options.performAction(action, requestTabId, toolCall.arguments, state.abortController.signal))
                    ) ?? {});
              lastResult = summarizeResult(result);
              let source: SourceAttribution | undefined;

              if (action === "draft_email") {
                state.draftArtifact = result as unknown as DraftArtifact;
              }

              if (action === "search_web") {
                const searchSources = parseSearchResultSources(result);
                if (searchSources.length > 0) {
                  for (const searchSource of searchSources) {
                    pushUniqueSource(state.sources, searchSource);
                    const citationIndex = extractCitationIndex(searchSource.id);
                    if (typeof citationIndex === "number") {
                      webCitationIndex = Math.max(webCitationIndex, citationIndex);
                    }
                  }
                  source = searchSources[0];
                } else {
                  webCitationIndex += 1;
                  source = {
                    id: `[web:${webCitationIndex}]`,
                    origin: "web",
                    action
                  };
                  pushUniqueSource(state.sources, source);
                }
              } else if (action === "read_page" || action === "get_page_text" || action === "find") {
                webCitationIndex += 1;
                source = {
                  id: `[web:${webCitationIndex}]`,
                  origin: "web",
                  action
                };
                pushUniqueSource(state.sources, source);
                state.lastValidatedObservation = buildValidationObservation(action, result);
              } else if (action === "computer" && typeof result.screenshot_b64 === "string") {
                screenshotCitationIndex += 1;
                source = {
                  id: `[screenshot:${screenshotCitationIndex}]`,
                  origin: "screenshot",
                  action
                };
                pushUniqueSource(state.sources, source);
              }
              if (action === "computer" && result.javascript_dialog && typeof result.javascript_dialog === "object") {
                pendingJavaScriptDialog = {
                  type: typeof result.javascript_dialog.type === "string" ? result.javascript_dialog.type : "dialog",
                  message: typeof result.javascript_dialog.message === "string" ? result.javascript_dialog.message : "",
                  ...(typeof result.javascript_dialog.default_prompt === "string"
                    ? { default_prompt: result.javascript_dialog.default_prompt }
                    : {})
                };
                state.lastValidatedObservation = `JavaScript dialog open (${pendingJavaScriptDialog.type}): ${pendingJavaScriptDialog.message}`;
              } else if (
                action === "computer" &&
                isRecord(payload) &&
                Array.isArray(payload.steps) &&
                payload.steps.some((step) => isRecord(step) && step.kind === "dialog")
              ) {
                pendingJavaScriptDialog = undefined;
              }

              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "completed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps + 1,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    result: lastResult,
                    ...(source ? { source: source as unknown as JsonObject } : {})
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              // Emit tool_done SSE so panel can mark the action item complete
              emitToolEvent(state, options.onToolEvent, {
                type: "tool_done",
                run_id: state.runId,
                tool_call_id: toolCall.id,
                ok: true
              });
              consecutiveFailures = 0;

              // Flag page load wait if we navigated (applied before next LLM turn)
              if (action === "navigate" || action === "tabs_create") {
                needsPageLoadWait = true;
                needsStructuredInspectionAfterNavigation = true;
                needsPostActionValidation = false;
                postActionValidationReminderTrips = 0;
              } else if (isStructuredInspectionAction(action)) {
                needsStructuredInspectionAfterNavigation = false;
              }

              if (policy.requireValidationAfterPageActions) {
                if (isPostActionValidationAction(action)) {
                  needsPostActionValidation = false;
                  postActionValidationReminderTrips = 0;
                } else if (requiresValidationAfterPageAction(action, payload, result)) {
                  needsPostActionValidation = true;
                  postActionValidationReminderTrips = 0;
                }
              }

              // Vision mode: auto-screenshot after navigate/form_input so the LLM can verify
              if (enableVision && (action === "navigate" || action === "form_input")) {
                try {
                  const visionResult = await options.performAction("computer", requestTabId, { action: "screenshot" }, state.abortController.signal);
                  const visionData = typeof visionResult.screenshot_b64 === "string" ? visionResult.screenshot_b64 : undefined;
                  if (visionData && visionData.length > 100) {
                    screenshotCitationIndex += 1;
                    pushUniqueSource(state.sources, { id: `[screenshot:${screenshotCitationIndex}]`, origin: "screenshot", action: "computer" });
                    messages.push({
                      role: "user",
                      content: [
                        { type: "text" as const, text: "Visual verification screenshot after action:" },
                        { type: "image" as const, media_type: "image/png" as const, data: visionData }
                      ] as unknown as string
                    });
                  }
                } catch {
                  // Vision screenshot is best-effort; ignore failures
                }
              }

              // If the tool returned a screenshot, attach it as an image content part
              // so vision-capable models can actually "see" the page
              const screenshotData = typeof result.screenshot_b64 === "string" ? result.screenshot_b64 : undefined;
              if (screenshotData && screenshotData.length > 100) {
                // Strip the screenshot from the JSON to avoid bloating the text part
                const textResult = { ...result };
                delete textResult.screenshot_b64;
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  tool_name: toolCall.name,
                  content: [
                    { type: "text" as const, text: JSON.stringify(textResult) },
                    { type: "image" as const, media_type: "image/png" as const, data: screenshotData }
                  ]
                });
              } else {
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  tool_name: toolCall.name,
                  content: JSON.stringify(result)
                });
              }
            } catch (error) {
              const normalized = normalizeExecutorError(error);
              appendStep(
                state,
                {
                  ts: nowIso(),
                  phase: "executor",
                  action,
                  status: "failed",
                  details: {
                    step_id: toolCall.id,
                    step_index: executedSteps + 1,
                    description: `Execute ${toolCall.name}`,
                    input_hash: inputHash,
                    payload,
                    error_code: normalized.code,
                    error_message: normalized.message
                  }
                },
                memoryStore,
                options.onRunUpdated
              );

              // Emit tool_done (failure) SSE — Comet: includes failure_reason for diagnostics
              emitToolEvent(state, options.onToolEvent, {
                type: "tool_done",
                run_id: state.runId,
                tool_call_id: toolCall.id,
                step_type: action,
                ok: false,
                failure_reason: normalized.code   // Comet: e.failureReason
              });

              consecutiveFailures += 1;
              if (failureTolerance > 0 && consecutiveFailures >= failureTolerance) {
                throw Object.assign(
                  new Error(`Agent stopped after ${consecutiveFailures} consecutive tool failures. Last error: ${normalized.message}`),
                  { code: "FAILURE_TOLERANCE_EXCEEDED", retryable: false }
                );
              }

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                tool_name: toolCall.name,
                content: JSON.stringify({
                  ok: false,
                  error_code: normalized.code,
                  error_message: normalized.message
                })
              });
            }

            executedSteps += 1;

            if (await pauseAtBoundary(state, memoryStore, options.onRunUpdated)) {
              continue outer;
            }

            // Replanning checkpoint: inject a review prompt every N steps
            if (replanningFrequency > 0 && executedSteps > 0 && executedSteps % replanningFrequency === 0) {
              messages.push({
                role: "user",
                content: `Checkpoint (step ${executedSteps}): Briefly review your progress. Confirm what has been accomplished, note any issues, and revise your approach if needed before continuing.`
              });
            }
          }

          continue;
        }

        if (typeof turn.assistantText !== "string" || turn.assistantText.trim().length === 0) {
            if (emptyProviderTurnRetries < EMPTY_PROVIDER_TURN_MAX_RETRIES) {
              emptyProviderTurnRetries += 1;
              forceFunctionCallingContinuation = Boolean(pendingJavaScriptDialog || state.lastValidatedObservation);
              messages.push({
                role: "user",
                content: buildEmptyTurnRecoveryPrompt(state, pendingJavaScriptDialog)
              });
              await delay(EMPTY_PROVIDER_TURN_RETRY_DELAY_MS);
              continue;
          }
          throw Object.assign(new Error(
            `Provider returned no assistant text or tool calls${turn.finishReason ? ` (finishReason: ${turn.finishReason})` : ""}.`
          ), {
            code: "MODEL_EMPTY_TURN",
            retryable: true
          });
        }

        emptyProviderTurnRetries = 0;
        forceFunctionCallingContinuation = false;

        if (policy.requireValidationAfterPageActions && needsPostActionValidation) {
          postActionValidationReminderTrips += 1;
          if (postActionValidationReminderTrips > 3) {
            throw Object.assign(
              new Error("Agent stopped because it repeatedly tried to continue without validating the latest page interaction."),
              {
                code: "ACTION_VALIDATION_REQUIRED",
                retryable: false
              }
            );
          }

          messages.push({
            role: "assistant",
            content: turn.assistantText,
            provider_parts: turn.provider_parts
          });
          messages.push({
            role: "user",
            content:
              "Before continuing or answering, verify the result of your most recent page interaction with read_page, find, or get_page_text. Do not take another state-changing action or give the final answer until you have checked the updated page state."
          });
          continue;
        }

        const availableCitations = state.sources
          .map((source) => source.id)
          .filter((id) => /^\[(?:web|screenshot):\d+\]$/.test(id));
        const validation = validateFinalAnswerWithAutofix({
          userPrompt: state.params.prompt,
          text: turn.assistantText,
          availableCitations,
          hasImageInput: state.hasImageInput
        });
        const finalAnswer = validation.ok
          ? validation.normalized_text
          : buildValidatedFinalAnswer({
              userPrompt: state.params.prompt,
              executedSteps,
              lastResult,
              availableCitations,
              hasImageInput: state.hasImageInput
            }).text;
        completeRun(finalAnswer, {
          executed_steps: executedSteps
        });
        return;
      }

      throw Object.assign(new Error(`AgentRun reached the max step limit (${maxSteps}).`), {
        code: "MAX_STEPS_EXCEEDED",
        retryable: false
      });
    } catch (error) {
      const normalized = normalizeExecutorError(error);
      const stopped = state.abortController.signal.aborted;
      state.status = stopped ? "stopped" : "failed";
      state.errorMessage = normalized.message;
      appendStep(
        state,
        {
          ts: nowIso(),
          phase: "executor",
          action: "execute",
          status: stopped ? "stopped" : "failed",
          details: {
            code: normalized.code,
            message: normalized.message
          }
        },
        memoryStore,
        options.onRunUpdated
      );
      memoryStore.upsert(state.runId, {
        status: state.status,
        error_message: state.errorMessage,
        task: buildTaskState(state) as unknown as JsonObject
      });
      if (state.role === "primary" && state.activeChildTaskId) {
        const child = taskManager.getByTaskId(state.activeChildTaskId);
        if (child) {
          stopChildTask(child, {
            code: "SUBAGENT_CANCELED",
            message: "Child task stopped because the parent task ended."
          });
        }
      }
      if (state.role === "subagent") {
        finalizeChildTask(state);
      }
    }
  };

  return {
    async run(params: AgentRunParams) {
      const state = createRunState(params, {
        role: "primary",
        visibility: "panel"
      });
      taskManager.register(state);
      memoryStore.upsert(state.runId, {
        status: state.status,
        params: redactSensitiveJson(params as unknown as JsonObject) ?? {},
        task: buildTaskState(state) as unknown as JsonObject
      });
      publishTaskUpdate(state);

      void executeRun(state);

      return {
        run_id: state.runId,
        status: "started"
      };
    },
    async pause(params: AgentPauseParams) {
      const state = taskManager.getByRunId(params.run_id);
      if (!state) {
        throw Object.assign(new Error(`Unknown run_id: ${params.run_id}`), {
          code: "RUN_NOT_FOUND",
          retryable: false
        });
      }

      if (state.status === "paused" || state.status === "pausing") {
        return {
          run_id: state.runId,
          status: state.status
        };
      }

      if (state.status !== "running") {
        throw Object.assign(new Error(`Run ${params.run_id} is not running`), {
          code: "RUN_NOT_RUNNING",
          retryable: false
        });
      }

      state.pauseRequested = true;
      updateRunStatus(state, "pausing", memoryStore, options.onRunUpdated);

      return {
        run_id: state.runId,
        status: "pausing"
      };
    },
    async resume(params: AgentResumeParams) {
      const state = taskManager.getByRunId(params.run_id);
      if (!state) {
        throw Object.assign(new Error(`Unknown run_id: ${params.run_id}`), {
          code: "RUN_NOT_FOUND",
          retryable: false
        });
      }

      if (state.status !== "paused") {
        throw Object.assign(new Error(`Run ${params.run_id} is not paused`), {
          code: "RUN_NOT_PAUSED",
          retryable: false
        });
      }

      state.pauseRequested = false;
      state.resumeRequested = true;
      state.resumeNeedsReassessment = true;
      updateRunStatus(state, "running", memoryStore, options.onRunUpdated);
      releaseResumeGate(state);

      return {
        run_id: state.runId,
        status: "running"
      };
    },
    async stop(params: AgentStopParams) {
      const state = taskManager.getByRunId(params.run_id);
      if (!state) {
        throw Object.assign(new Error(`Unknown run_id: ${params.run_id}`), {
          code: "RUN_NOT_FOUND",
          retryable: false
        });
      }

      if (state.status !== "running" && state.status !== "pausing" && state.status !== "paused") {
        throw Object.assign(new Error(`Run ${params.run_id} is not running`), {
          code: "RUN_NOT_RUNNING",
          retryable: false
        });
      }

      if (state.role === "primary") {
        for (const childRunId of taskManager.getDescendantRunIds(state.taskId)) {
          const child = taskManager.getByRunId(childRunId);
          if (!child) {
            continue;
          }

          stopChildTask(child, {
            code: "SUBAGENT_CANCELED",
            message: "Child task stopped because the parent task stopped."
          });
        }
      }

      state.pauseRequested = false;
      state.resumeRequested = false;
      state.resumeNeedsReassessment = false;
      state.abortController.abort();
      releaseResumeGate(state);
      updateRunStatus(state, "stopped", memoryStore, options.onRunUpdated);

      return {
        run_id: state.runId,
        status: "stopped"
      };
    },
    async getState(params: AgentGetStateParams) {
      const state = taskManager.getByRunId(params.run_id);
      if (!state) {
        throw Object.assign(new Error(`Unknown run_id: ${params.run_id}`), {
          code: "RUN_NOT_FOUND",
          retryable: false
        });
      }

      return buildStateResult(state);
    },
    async createSubagent(params: CreateSubagentParams): Promise<CreateSubagentResult> {
      const parent = taskManager.getByTaskId(params.parent_task_id);
      if (!parent || parent.role !== "primary") {
        const rejectedTaskId = randomUUID();
        return {
          task_id: rejectedTaskId,
          status: "rejected",
          visibility: "hidden",
          summary: params.goal_summary,
          error: {
            code: "SUBAGENT_PARENT_INVALID",
            message: "Subagents can only be created from a primary task."
          }
        };
      }

      const childPrompt = params.start_url
        ? `${params.prompt}\n\nStart URL: ${params.start_url}`
        : params.prompt;
      const childState = createRunState(
        {
          ...parent.params,
          prompt: childPrompt
        },
        {
          role: "subagent",
          visibility: "hidden",
          parentTaskId: params.parent_task_id
        }
      );

      const result = taskManager.linkChild(params.parent_task_id, childState);
      if (result.status === "rejected") {
        return {
          ...result,
          summary: params.goal_summary
        };
      }

      memoryStore.upsert(childState.runId, {
        status: childState.status,
        params: redactSensitiveJson(childState.params as unknown as JsonObject) ?? {},
        task: buildTaskState(childState) as unknown as JsonObject
      });
      writeParentTaskPatch(parent);
      void executeRun(childState);

      return {
        ...result,
        summary: params.goal_summary
      };
    }
  };
}
