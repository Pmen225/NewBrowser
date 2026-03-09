import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { isAbsolute } from "node:path";

import type {
  ComputerBatchParams,
  ComputerBatchResult,
  ComputerStep,
  ExtensionOperationParams,
  ExtensionOperationResult,
  FormInputField,
  FormInputParams,
  FormInputResult,
  NavigateParams,
  NavigateResult,
  OverlayTelemetry,
  TabOperationParams,
  TabOperationResult
} from "../../shared/src/transport";
import { parseRefId, type ParsedRefId } from "../sidecar/tools/browser-action-types";
import type { FrameTreeSnapshot, JavaScriptDialogRecord, SessionRoute, TabRecord } from "./types";

const DEFAULT_NAVIGATION_TIMEOUT_MS = 10_000;
const DIALOG_OPEN_TIMEOUT_MS = 1_000;
const DIALOG_CLOSE_TIMEOUT_MS = 1_500;

// Track injected sessions per runtime so separate dispatcher/runtime instances
// do not share bootstrap state through reused fake session ids.
const _stealthInjectedSessionsByRuntime = new WeakMap<BrowserActionRuntime, Set<string>>();

// Stealth script injected via Page.addScriptToEvaluateOnNewDocument:
// 1. Hides navigator.webdriver (automation detection)
// 2. Handles cookie consent banners with a privacy-preserving reject-first policy,
//    but falls back to accept when a blocking gate offers no non-accept path.
const STEALTH_SCRIPT = `
(function() {
  const root = globalThis;

  function installConsentHelpers() {
    if (root.__atlasConsentSweep) {
      return;
    }

    const CONSENT_TERMS = /(cookie|privacy|consent|gdpr|tracking|your choice|your choices|consent choices|data processing|privacy settings|partner purposes)/i;
    const NON_ACCEPT_PATTERNS = /(reject|decline|refuse|deny|no thanks|opt out|without accepting|necessary only|essential only|only necessary|only essential|reject optional|do not accept|i do not accept|dismiss|close)/i;
    const ACCEPT_PATTERNS = /(accept|agree|allow all|allow cookies|yes[, ]?i agree|got it)/i;
    const DISALLOWED_PATTERNS = /(pay|subscribe|sign in|log in|login|register|join now|start trial|privacy policy|learn more|show purposes|partners|vendor|continue reading|already a paying subscriber)/i;
    const INTERACTABLE_SELECTORS = [
      'button',
      '[role="button"]',
      'a',
      'input[type="button"]',
      'input[type="submit"]',
      'summary'
    ].join(',');

    function textFor(el) {
      return (el.textContent || el.getAttribute('aria-label') || el.getAttribute('value') || '').replace(/\\s+/g, ' ').trim();
    }

    function isVisible(el) {
      if (!(el instanceof Element)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
      return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    }

    function looksLikeConsentContainer(el) {
      if (!(el instanceof Element)) return false;
      const text = [textFor(el), el.id || '', el.className || '', el.getAttribute('aria-label') || ''].join(' ');
      if (!CONSENT_TERMS.test(text)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 70) return false;
      const style = getComputedStyle(el);
      return (
        el.getAttribute('aria-modal') === 'true' ||
        el.getAttribute('role') === 'dialog' ||
        style.position === 'fixed' ||
        style.position === 'sticky' ||
        rect.width >= window.innerWidth * 0.4 ||
        rect.height >= window.innerHeight * 0.16
      );
    }

    function findConsentContainer(el) {
      let node = el instanceof Element ? el : null;
      while (node) {
        if (looksLikeConsentContainer(node)) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    function collectCandidates() {
      const nodes = Array.from(document.querySelectorAll(INTERACTABLE_SELECTORS));
      return nodes
        .filter((el) => isVisible(el))
        .map((el) => {
          const label = textFor(el);
          const container = findConsentContainer(el);
          return { el, label, container };
        })
        .filter((entry) => entry.label && entry.container);
    }

    root.__atlasConsentSweep = function() {
      const candidates = collectCandidates();
      if (candidates.length === 0) {
        return { action: null };
      }

      const preferred = candidates.find(({ label }) => NON_ACCEPT_PATTERNS.test(label) && !DISALLOWED_PATTERNS.test(label));
      if (preferred) {
        preferred.el.click();
        return { action: 'dismiss', label: preferred.label };
      }

      const blockingGate = candidates.some(({ container }) => Boolean(container));
      if (!blockingGate) {
        return { action: null };
      }

      const acceptFallback = candidates.find(({ label }) => ACCEPT_PATTERNS.test(label) && !DISALLOWED_PATTERNS.test(label));
      if (acceptFallback) {
        acceptFallback.el.click();
        return { action: 'accept', label: acceptFallback.label };
      }

      return { action: null };
    };

    const observer = new MutationObserver(() => {
      try {
        root.__atlasConsentSweep();
      } catch {}
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Hide webdriver indicator (Cloudflare, Reddit, etc. check this)
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  } catch {}

  // Make navigator.plugins non-empty (bot fingerprint check)
  try {
    if (navigator.plugins.length === 0) {
      Object.defineProperty(navigator, 'plugins', {
        get: () => ({ length: 3, 0: { name: 'PDF Viewer' }, 1: { name: 'Chrome PDF Viewer' }, 2: { name: 'Chromium PDF Viewer' } })
      });
    }
  } catch {}

  installConsentHelpers();
  root.__atlasConsentSweep();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      root.__atlasConsentSweep();
      setTimeout(() => root.__atlasConsentSweep(), 250);
      setTimeout(() => root.__atlasConsentSweep(), 800);
      setTimeout(() => root.__atlasConsentSweep(), 1600);
      setTimeout(() => root.__atlasConsentSweep(), 3200);
    });
  } else {
    setTimeout(() => root.__atlasConsentSweep(), 120);
    setTimeout(() => root.__atlasConsentSweep(), 500);
    setTimeout(() => root.__atlasConsentSweep(), 1100);
    setTimeout(() => root.__atlasConsentSweep(), 2500);
  }
})();
`;

// Comet-like screenshot reuse: track last screenshot per tabId (LR = 1000 ms)
interface ScreenshotCacheEntry {
  b64: string;
  takenAtMs: number;
  lastWasClick: boolean;
}
const _lastBatchScreenshot = new Map<string, ScreenshotCacheEntry>();

interface RouteLike {
  route: (tabId: string, frameId?: string) => SessionRoute;
}

export interface BrowserActionRuntime extends RouteLike {
  send<T>(method: string, params?: object, sessionId?: string): Promise<T>;
  routeByFrameOrdinal?: (tabId: string, frameOrdinal: number) => SessionRoute;
  getTab(tabId: string): TabRecord | undefined;
  listTabs(): TabRecord[];
  getJavaScriptDialog?: (tabId: string) => JavaScriptDialogRecord | undefined;
  clearJavaScriptDialog?: (tabId: string) => void;
  groupTabs?: (
    tabIds: string[],
    options?: {
      groupName?: string;
      groupColor?: string;
    }
  ) => Promise<{
    tabIds: string[];
    chromeTabIds: number[];
    groupId: number;
    groupName: string;
  }>;
  ungroupTabs?: (tabIds: string[]) => Promise<{
    tabIds: string[];
    chromeTabIds: number[];
  }>;
  manageExtensions?: (params: ExtensionOperationParams) => Promise<ExtensionOperationResult>;
  navigateSensitivePage?: (tabId: string, url: string) => Promise<{
    tabId: string;
    chromeTabId: number;
    url: string;
    title?: string;
  }>;
  attachTab?: (targetId: string) => Promise<TabRecord>;
  enableDomains?: (tabId: string) => Promise<void>;
  refreshFrameTree?: (tabId: string) => Promise<FrameTreeSnapshot>;
  invalidateTab?: (tabId: string) => void;
  waitForLoadEvent?: (sessionId: string, timeoutMs: number, signal: AbortSignal) => Promise<void>;
}

export class BrowserActionError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, retryable: boolean, details?: Record<string, unknown>) {
    super(message);
    this.name = "BrowserActionError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

interface Point {
  x: number;
  y: number;
}

interface LegacySyntheticClickResult {
  kind: "legacy_synthetic_click";
}

interface ResolvedNode {
  route: SessionRoute;
  backendNodeId: number;
  objectId: string;
}

interface ResolvedRef {
  route: SessionRoute;
  parsed: ParsedRefId;
}

interface SensitiveInputInspection {
  blocked: boolean;
  reason?: string;
}

interface ComputerStepOutcome {
  javascriptDialog?: NonNullable<ComputerBatchResult["javascript_dialog"]>;
  overlay?: OverlayTelemetry;
}

type ComputerBatchPreparedSessions = Set<string>;

type ClickResolution =
  | { kind: "release" }
  | { kind: "dialog"; dialog?: NonNullable<ComputerBatchResult["javascript_dialog"]> }
  | { kind: "release_timeout" };

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "Unexpected browser action failure";
}

function isStaleReferenceError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes("no node with given id") ||
    message.includes("node does not exist") ||
    message.includes("cannot find context with specified id") ||
    message.includes("execution context was destroyed")
  );
}

function isTimeoutLikeError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  return message.includes("timeout") || message.includes("timed out");
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  const message = normalizeErrorMessage(error).toLowerCase();
  return message.includes("abort");
}

function createRequestAbortedError(): BrowserActionError {
  return new BrowserActionError("REQUEST_ABORTED", "Request was aborted", true);
}

function toBrowserActionError(
  error: unknown,
  fallbackCode: string,
  fallbackRetryable: boolean,
  details?: Record<string, unknown>
): BrowserActionError {
  if (error instanceof BrowserActionError) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      retryable?: unknown;
      message?: unknown;
      context?: unknown;
    };

    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      const resolvedRetryable = candidate.retryable === true;
      const context =
        candidate.context && typeof candidate.context === "object"
          ? { ...(candidate.context as Record<string, unknown>) }
          : undefined;

      return new BrowserActionError(candidate.code, candidate.message, resolvedRetryable, {
        ...(context ?? {}),
        ...(details ?? {})
      });
    }
  }

  if (isStaleReferenceError(error)) {
    return new BrowserActionError("STALE_REF", "Element reference is stale", true, details);
  }

  if (isAbortLikeError(error)) {
    return createRequestAbortedError();
  }

  return new BrowserActionError(fallbackCode, normalizeErrorMessage(error), fallbackRetryable, details);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw createRequestAbortedError();
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSessionRoute(runtime: RouteLike, tabId: string): SessionRoute {
  try {
    return runtime.route(tabId);
  } catch (error) {
    throw toBrowserActionError(error, "TAB_NOT_FOUND", false, { tab_id: tabId });
  }
}

function routeForRef(runtime: BrowserActionRuntime, tabId: string, refId: string): ResolvedRef {
  const parsed = parseRefId(refId);
  if (!parsed) {
    throw new BrowserActionError("INVALID_REF", `Invalid ref_id: ${refId}`, false, {
      ref_id: refId
    });
  }

  if (parsed.frame_ordinal === 0) {
    return {
      parsed,
      route: getSessionRoute(runtime, tabId)
    };
  }

  if (!runtime.routeByFrameOrdinal) {
    throw new BrowserActionError("FRAME_NOT_FOUND", `Frame ordinal ${parsed.frame_ordinal} is not available`, false, {
      tab_id: tabId,
      frame_ordinal: parsed.frame_ordinal
    });
  }

  try {
    return {
      parsed,
      route: runtime.routeByFrameOrdinal(tabId, parsed.frame_ordinal)
    };
  } catch (error) {
    throw toBrowserActionError(error, "FRAME_NOT_FOUND", false, {
      tab_id: tabId,
      frame_ordinal: parsed.frame_ordinal
    });
  }
}

async function resolveNodeFromResolvedRef(
  runtime: BrowserActionRuntime,
  resolvedRef: ResolvedRef,
  refId: string
): Promise<ResolvedNode> {
  try {
    const response = await runtime.send<{ object?: { objectId?: string } }>(
      "DOM.resolveNode",
      { backendNodeId: resolvedRef.parsed.backend_node_id },
      resolvedRef.route.sessionId
    );

    const objectId = response.object?.objectId;
    if (!objectId) {
      throw new BrowserActionError("ACTION_TARGET_INVALID", "Resolved node does not expose an objectId", true, {
        ref_id: refId
      });
    }

    return {
      route: resolvedRef.route,
      backendNodeId: resolvedRef.parsed.backend_node_id,
      objectId
    };
  } catch (error) {
    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
      ref_id: refId
    });
  }
}

async function resolveNode(runtime: BrowserActionRuntime, tabId: string, refId: string): Promise<ResolvedNode> {
  return resolveNodeFromResolvedRef(runtime, routeForRef(runtime, tabId, refId), refId);
}

async function getCenterPoint(runtime: BrowserActionRuntime, node: ResolvedNode): Promise<Point> {
  try {
    await runtime.send("DOM.scrollIntoViewIfNeeded", { backendNodeId: node.backendNodeId }, node.route.sessionId);

    const response = await runtime.send<{ result?: { value?: unknown } }>(
      "Runtime.callFunctionOn",
      {
        objectId: node.objectId,
        functionDeclaration:
          "function() { const rect = this.getBoundingClientRect && this.getBoundingClientRect(); if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top) || rect.width <= 0 || rect.height <= 0) return null; return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }",
        returnByValue: true,
        awaitPromise: true
      },
      node.route.sessionId
    );

    const value = response.result?.value;
    if (!value || typeof value !== "object") {
      throw new BrowserActionError("ACTION_TARGET_INVALID", "Unable to derive click coordinates for element", true);
    }

    const x = (value as { x?: unknown }).x;
    const y = (value as { y?: unknown }).y;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new BrowserActionError("ACTION_TARGET_INVALID", "Element click coordinates are invalid", true);
    }

    return { x, y };
  } catch (error) {
    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
      backend_node_id: node.backendNodeId
    });
  }
}

async function getClickPoint(runtime: BrowserActionRuntime, node: ResolvedNode): Promise<Point | LegacySyntheticClickResult> {
  try {
    await runtime.send("DOM.scrollIntoViewIfNeeded", { backendNodeId: node.backendNodeId }, node.route.sessionId);

    const response = await runtime.send<{ result?: { value?: unknown } }>(
      "Runtime.callFunctionOn",
      {
        objectId: node.objectId,
        functionDeclaration:
          "function() { const rect = this.getBoundingClientRect && this.getBoundingClientRect(); if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top) || rect.width <= 0 || rect.height <= 0) return null; return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }",
        returnByValue: true,
        awaitPromise: true
      },
      node.route.sessionId
    );

    if (response.result?.value === true) {
      return { kind: "legacy_synthetic_click" };
    }

    const value = response.result?.value;
    if (!value || typeof value !== "object") {
      throw new BrowserActionError("ACTION_TARGET_INVALID", "Unable to derive click coordinates for element", true);
    }

    const x = (value as { x?: unknown }).x;
    const y = (value as { y?: unknown }).y;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new BrowserActionError("ACTION_TARGET_INVALID", "Element click coordinates are invalid", true);
    }

    return { x, y };
  } catch (error) {
    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
      backend_node_id: node.backendNodeId
    });
  }
}

function createPointOverlay(x: number, y: number, click = false): OverlayTelemetry {
  return {
    cursor: { x, y },
    ...(click ? { click: { x, y } } : {})
  };
}

async function dispatchClick(runtime: BrowserActionRuntime, sessionId: string, point: Point, button: string, clickCount: number): Promise<void> {
  await runtime.send(
    "Input.dispatchMouseEvent",
    {
      type: "mousePressed",
      button,
      x: point.x,
      y: point.y,
      clickCount
    },
    sessionId
  );

  await runtime.send(
    "Input.dispatchMouseEvent",
    {
      type: "mouseReleased",
      button,
      x: point.x,
      y: point.y,
      clickCount
    },
    sessionId
  );
}

function normalizePrimaryKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  const normalized = trimmed.toLowerCase();
  if (normalized === "return" || normalized === "enter") {
    return "Enter";
  }
  if (normalized === "esc" || normalized === "escape") {
    return "Escape";
  }
  if (normalized === "space") {
    return " ";
  }
  return trimmed;
}

function normalizeModifierKey(token: string): string | undefined {
  const normalized = token.trim().toLowerCase();
  if (normalized === "ctrl" || normalized === "control") {
    return "Control";
  }
  if (normalized === "alt" || normalized === "option") {
    return "Alt";
  }
  if (normalized === "shift") {
    return "Shift";
  }
  if (normalized === "cmd" || normalized === "command" || normalized === "meta") {
    return "Meta";
  }
  return undefined;
}

function parseKeyChord(rawKey: string): { modifiers: string[]; primaryKey: string } {
  const parts = rawKey
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length <= 1) {
    return {
      modifiers: [],
      primaryKey: normalizePrimaryKey(rawKey)
    };
  }

  const modifiers: string[] = [];
  for (const token of parts.slice(0, -1)) {
    const modifier = normalizeModifierKey(token);
    if (!modifier) {
      return {
        modifiers: [],
        primaryKey: normalizePrimaryKey(rawKey)
      };
    }
    modifiers.push(modifier);
  }

  return {
    modifiers,
    primaryKey: normalizePrimaryKey(parts[parts.length - 1] ?? rawKey)
  };
}

async function dispatchKeySequence(runtime: BrowserActionRuntime, sessionId: string, rawKey: string): Promise<void> {
  const parsed = parseKeyChord(rawKey);

  for (const modifier of parsed.modifiers) {
    await runtime.send("Input.dispatchKeyEvent", { type: "keyDown", key: modifier }, sessionId);
  }

  await runtime.send("Input.dispatchKeyEvent", { type: "keyDown", key: parsed.primaryKey }, sessionId);
  await runtime.send("Input.dispatchKeyEvent", { type: "keyUp", key: parsed.primaryKey }, sessionId);

  for (let index = parsed.modifiers.length - 1; index >= 0; index -= 1) {
    await runtime.send("Input.dispatchKeyEvent", { type: "keyUp", key: parsed.modifiers[index] }, sessionId);
  }
}

function parseSensitiveInputInspection(value: unknown): SensitiveInputInspection {
  if (!isRecordLike(value)) {
    return { blocked: false };
  }

  return {
    blocked: value.blocked === true,
    reason: typeof value.reason === "string" && value.reason.trim().length > 0 ? value.reason : undefined
  };
}

async function assertTextEntryAllowed(runtime: BrowserActionRuntime, node: ResolvedNode, refId: string): Promise<void> {
  try {
    const response = await runtime.send<{ result?: { value?: unknown } }>(
      "Runtime.callFunctionOn",
      {
        objectId: node.objectId,
        functionDeclaration:
          "function() { const el = this; if (!(el instanceof Element)) return { blocked: false }; if (el instanceof HTMLInputElement) { const type = String(el.type || '').toLowerCase(); const autocomplete = String(el.autocomplete || '').toLowerCase(); const blocked = type === 'password' || autocomplete.includes('current-password') || autocomplete.includes('new-password'); return { blocked, reason: blocked ? 'password_input' : undefined }; } return { blocked: false }; }",
        returnByValue: true,
        awaitPromise: true
      },
      node.route.sessionId
    );
    const inspection = parseSensitiveInputInspection(response.result?.value);
    if (!inspection.blocked) {
      return;
    }

    throw new BrowserActionError("SENSITIVE_INPUT_BLOCKED", "Password entry must be completed by the user", false, {
      ref_id: refId,
      reason: inspection.reason ?? "sensitive_input"
    });
  } catch (error) {
    if (error instanceof BrowserActionError && error.code === "SENSITIVE_INPUT_BLOCKED") {
      throw error;
    }

    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
      ref_id: refId
    });
  }
}

async function assertActiveTextEntryAllowed(runtime: BrowserActionRuntime, sessionId: string): Promise<void> {
  try {
    const response = await runtime.send<{ result?: { value?: unknown } }>(
      "Runtime.evaluate",
      {
        expression:
          "(() => { const el = document.activeElement; if (!(el instanceof Element)) return { blocked: false }; if (el instanceof HTMLInputElement) { const type = String(el.type || '').toLowerCase(); const autocomplete = String(el.autocomplete || '').toLowerCase(); const blocked = type === 'password' || autocomplete.includes('current-password') || autocomplete.includes('new-password'); return { blocked, reason: blocked ? 'password_input' : undefined }; } return { blocked: false }; })()",
        returnByValue: true,
        awaitPromise: true
      },
      sessionId
    );
    const inspection = parseSensitiveInputInspection(response.result?.value);
    if (!inspection.blocked) {
      return;
    }

    throw new BrowserActionError("SENSITIVE_INPUT_BLOCKED", "Password entry must be completed by the user", false, {
      reason: inspection.reason ?? "sensitive_input"
    });
  } catch (error) {
    if (error instanceof BrowserActionError && error.code === "SENSITIVE_INPUT_BLOCKED") {
      throw error;
    }

    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
  }
}

async function captureBatchScreenshot(runtime: BrowserActionRuntime, sessionId: string): Promise<string> {
  const capture = await runtime.send<{ data?: string }>("Page.captureScreenshot", { format: "png" }, sessionId);
  if (typeof capture.data !== "string" || capture.data.length === 0) {
    throw new BrowserActionError("SCREENSHOT_FAILED", "Page.captureScreenshot returned an empty payload", true);
  }
  return capture.data;
}

function mapJavaScriptDialog(
  dialog: JavaScriptDialogRecord | undefined
): NonNullable<ComputerBatchResult["javascript_dialog"]> | undefined {
  if (!dialog) {
    return undefined;
  }

  return {
    type: dialog.type,
    message: dialog.message,
    ...(typeof dialog.defaultPrompt === "string" ? { default_prompt: dialog.defaultPrompt } : {})
  };
}

async function waitForJavaScriptDialogState(
  runtime: BrowserActionRuntime,
  tabId: string,
  expected: "open" | "closed",
  timeoutMs = 750,
  pollMs = 25
): Promise<NonNullable<ComputerBatchResult["javascript_dialog"]> | undefined> {
  if (!runtime.getJavaScriptDialog) {
    if (expected === "closed") {
      return undefined;
    }

    throw new BrowserActionError("DIALOG_NOT_OPEN", "No JavaScript dialog is currently open", false, {
      tab_id: tabId
    });
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const mapped = mapJavaScriptDialog(runtime.getJavaScriptDialog(tabId));
    if (expected === "open" && mapped) {
      return mapped;
    }
    if (expected === "closed" && !mapped) {
      return undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  if (expected === "closed") {
    throw new BrowserActionError("DIALOG_NOT_CLOSED", "JavaScript dialog did not close after handling", true, {
      tab_id: tabId
    });
  }

  throw new BrowserActionError("DIALOG_NOT_OPEN", "No JavaScript dialog is currently open", false, {
    tab_id: tabId
  });
}

async function dispatchClickWithDialogObservation(
  runtime: BrowserActionRuntime,
  tabId: string,
  sessionId: string,
  point: Point,
  button: string,
  clickCount: number,
  dialogTimeoutMs: number,
  nextStep?: ComputerStep
): Promise<ComputerStepOutcome | undefined> {
  await runtime.send(
    "Input.dispatchMouseEvent",
    {
      type: "mousePressed",
      button,
      x: point.x,
      y: point.y,
      clickCount
    },
    sessionId
  );

  const releasePromise = runtime.send(
    "Input.dispatchMouseEvent",
    {
      type: "mouseReleased",
      button,
      x: point.x,
      y: point.y,
      clickCount
    },
    sessionId
  );
  const dialogPromise = runtime.getJavaScriptDialog
    ? waitForJavaScriptDialogState(runtime, tabId, "open", dialogTimeoutMs, 25).catch((error) => {
        if (error instanceof BrowserActionError && error.code === "DIALOG_NOT_OPEN") {
          return new Promise<undefined>(() => undefined);
        }
        throw error;
      })
    : new Promise<undefined>(() => undefined);
  const releaseWatchdogMs = Math.max(dialogTimeoutMs, nextStep?.kind === "dialog" ? 1_000 : 500);

  const raced = await Promise.race([
    releasePromise.then(() => ({ kind: "release" as const })),
    dialogPromise.then((dialog) => ({ kind: "dialog" as const, dialog })),
    new Promise<ClickResolution>((resolve) => {
      setTimeout(() => {
        resolve({ kind: "release_timeout" });
      }, releaseWatchdogMs);
    })
  ]);
  if (raced.kind === "dialog" && raced.dialog) {
    return { javascriptDialog: raced.dialog };
  }
  if (raced.kind === "release_timeout") {
    const dialog = mapJavaScriptDialog(runtime.getJavaScriptDialog?.(tabId));
    if (dialog) {
      return {
        javascriptDialog: dialog
      };
    }
    return undefined;
  }

  await releasePromise;
  const dialog = runtime.getJavaScriptDialog
    ? await waitForJavaScriptDialogState(runtime, tabId, "open", 75, 25).catch((error) => {
        if (error instanceof BrowserActionError && error.code === "DIALOG_NOT_OPEN") {
          return undefined;
        }
        throw error;
      })
    : undefined;
  return dialog ? { javascriptDialog: dialog } : undefined;
}

async function ensureComputerBatchSessionPrepared(
  runtime: BrowserActionRuntime,
  preparedSessions: ComputerBatchPreparedSessions,
  sessionId: string
): Promise<void> {
  if (preparedSessions.has(sessionId)) {
    return;
  }
  await ensureStealthAndConsentReady(runtime, sessionId);
  preparedSessions.add(sessionId);
}

async function runComputerStep(
  runtime: BrowserActionRuntime,
  tabId: string,
  defaultRoute: SessionRoute,
  step: ComputerStep,
  nextStep: ComputerStep | undefined,
  preparedSessions: ComputerBatchPreparedSessions
): Promise<ComputerStepOutcome | undefined> {
  if (step.kind === "click") {
    const dialogTimeoutMs = nextStep?.kind === "dialog" ? DIALOG_OPEN_TIMEOUT_MS : 300;
    if (step.ref) {
      const resolvedRef = routeForRef(runtime, tabId, step.ref);
      if (resolvedRef.route.sessionId === defaultRoute.sessionId) {
        await ensureComputerBatchSessionPrepared(runtime, preparedSessions, resolvedRef.route.sessionId);
      }
      const node = await resolveNodeFromResolvedRef(runtime, resolvedRef, step.ref);
      try {
        if (node.route.sessionId !== defaultRoute.sessionId) {
          await ensureComputerBatchSessionPrepared(runtime, preparedSessions, node.route.sessionId);
        }
        const point = await getClickPoint(runtime, node);
        if ("kind" in point && point.kind === "legacy_synthetic_click") {
          return undefined;
        }
        const outcome = await dispatchClickWithDialogObservation(
          runtime,
          tabId,
          node.route.sessionId,
          point,
          "left",
          1,
          dialogTimeoutMs,
          nextStep
        );
        return {
          ...(outcome ?? {}),
          overlay: createPointOverlay(point.x, point.y, true)
        };
      } catch (error) {
        throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
          ref_id: step.ref
        });
      }
    }

    try {
      await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
      const outcome = await dispatchClickWithDialogObservation(
        runtime,
        tabId,
        defaultRoute.sessionId,
        { x: step.x as number, y: step.y as number },
        step.button ?? "left",
        step.click_count ?? 1,
        dialogTimeoutMs,
        nextStep
      );
      return {
        ...(outcome ?? {}),
        overlay: createPointOverlay(step.x as number, step.y as number, true)
      };
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
    }
  }

  if (step.kind === "type") {
    if (step.ref) {
      const resolvedRef = routeForRef(runtime, tabId, step.ref);
      if (resolvedRef.route.sessionId === defaultRoute.sessionId) {
        await ensureComputerBatchSessionPrepared(runtime, preparedSessions, resolvedRef.route.sessionId);
      }
      const node = await resolveNodeFromResolvedRef(runtime, resolvedRef, step.ref);
      try {
        if (node.route.sessionId !== defaultRoute.sessionId) {
          await ensureComputerBatchSessionPrepared(runtime, preparedSessions, node.route.sessionId);
        }
        await assertTextEntryAllowed(runtime, node, step.ref);
        await runtime.send("DOM.focus", { backendNodeId: node.backendNodeId }, node.route.sessionId);
        await runtime.send("Input.insertText", { text: step.text }, node.route.sessionId);
      } catch (error) {
        throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
          ref_id: step.ref
        });
      }
      return undefined;
    }

    try {
      await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
      await assertActiveTextEntryAllowed(runtime, defaultRoute.sessionId);
      await runtime.send("Input.insertText", { text: step.text }, defaultRoute.sessionId);
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
    }

    return undefined;
  }

  if (step.kind === "key") {
    try {
      if (!step.key.includes("+")) {
        await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
      }
      await dispatchKeySequence(runtime, defaultRoute.sessionId, step.key);
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
        key: step.key
      });
    }
    return undefined;
  }

  if (step.kind === "scroll") {
    try {
      let route = defaultRoute;
      let point: Point = { x: 0, y: 0 };
      if (step.ref) {
        const resolvedRef = routeForRef(runtime, tabId, step.ref);
        if (resolvedRef.route.sessionId === defaultRoute.sessionId) {
          await ensureComputerBatchSessionPrepared(runtime, preparedSessions, resolvedRef.route.sessionId);
        }
        const node = await resolveNodeFromResolvedRef(runtime, resolvedRef, step.ref);
        if (node.route.sessionId !== defaultRoute.sessionId) {
          await ensureComputerBatchSessionPrepared(runtime, preparedSessions, node.route.sessionId);
        }
        route = node.route;
        point = await getCenterPoint(runtime, node);
      } else if (typeof step.x === "number" && typeof step.y === "number") {
        await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
        point = {
          x: step.x,
          y: step.y
        };
      }

      await runtime.send(
        "Input.dispatchMouseEvent",
        {
          type: "mouseWheel",
          x: point.x,
          y: point.y,
          deltaX: step.delta_x ?? 0,
          deltaY: step.delta_y ?? 120
        },
        route.sessionId
      );
      // Comet-like: 250 ms settle wait after scroll (yt(250) in Comet source)
      await new Promise((r) => setTimeout(r, 250));
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
    }
    return undefined;
  }

  if (step.kind === "screenshot") {
    await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
    return undefined;
  }

  if (step.kind === "dialog") {
    try {
      await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
      await waitForJavaScriptDialogState(runtime, tabId, "open", DIALOG_OPEN_TIMEOUT_MS, 25);
      await runtime.send(
        "Page.handleJavaScriptDialog",
        {
          accept: step.accept,
          ...(typeof step.prompt_text === "string" ? { promptText: step.prompt_text } : {})
        },
        defaultRoute.sessionId
      );
      runtime.clearJavaScriptDialog?.(tabId);
      await waitForJavaScriptDialogState(runtime, tabId, "closed", DIALOG_CLOSE_TIMEOUT_MS, 25);
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
        accept: step.accept
      });
    }
    return undefined;
  }

  // Comet WAIT action — pause for duration_ms then continue (screenshot taken by caller)
  if (step.kind === "wait") {
    await new Promise<void>((resolve) => setTimeout(resolve, step.duration_ms));
    return undefined;
  }

  const fromResolvedRef = step.from_ref ? routeForRef(runtime, tabId, step.from_ref) : undefined;
  const toResolvedRef = step.to_ref ? routeForRef(runtime, tabId, step.to_ref) : undefined;
  if (fromResolvedRef?.route.sessionId === defaultRoute.sessionId) {
    await ensureComputerBatchSessionPrepared(runtime, preparedSessions, fromResolvedRef.route.sessionId);
  }
  if (!fromResolvedRef && toResolvedRef?.route.sessionId === defaultRoute.sessionId) {
    await ensureComputerBatchSessionPrepared(runtime, preparedSessions, toResolvedRef.route.sessionId);
  }
  if (!fromResolvedRef && !toResolvedRef) {
    await ensureComputerBatchSessionPrepared(runtime, preparedSessions, defaultRoute.sessionId);
  }
  const fromNode = fromResolvedRef ? await resolveNodeFromResolvedRef(runtime, fromResolvedRef, step.from_ref as string) : undefined;
  const toNode = toResolvedRef ? await resolveNodeFromResolvedRef(runtime, toResolvedRef, step.to_ref as string) : undefined;
  const fromPoint = fromNode
    ? await getCenterPoint(runtime, fromNode)
    : { x: step.from_x as number, y: step.from_y as number };
  const toPoint = toNode
    ? await getCenterPoint(runtime, toNode)
    : { x: step.to_x as number, y: step.to_y as number };

  const route = fromNode?.route ?? toNode?.route ?? defaultRoute;

  if (fromNode && toNode && fromNode.route.sessionId !== toNode.route.sessionId) {
    throw new BrowserActionError("ACTION_TARGET_INVALID", "Cross-session drag is not supported", true, {
      from_ref: step.from_ref,
      to_ref: step.to_ref
    });
  }

  try {
    if (route.sessionId !== defaultRoute.sessionId) {
      await ensureComputerBatchSessionPrepared(runtime, preparedSessions, route.sessionId);
    }
    await runtime.send(
      "Input.dispatchMouseEvent",
      {
        type: "mousePressed",
        button: "left",
        x: fromPoint.x,
        y: fromPoint.y,
        clickCount: 1
      },
      route.sessionId
    );

    await runtime.send(
      "Input.dispatchMouseEvent",
      {
        type: "mouseMoved",
        button: "left",
        x: toPoint.x,
        y: toPoint.y,
        clickCount: 1
      },
      route.sessionId
    );

    await runtime.send(
      "Input.dispatchMouseEvent",
      {
        type: "mouseReleased",
        button: "left",
        x: toPoint.x,
        y: toPoint.y,
        clickCount: 1
      },
      route.sessionId
    );
  } catch (error) {
    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
  }

  return undefined;
}

async function waitForNavigationIfConfigured(
  runtime: BrowserActionRuntime,
  sessionId: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<void> {
  throwIfAborted(signal);

  if (!runtime.waitForLoadEvent) {
    return;
  }

  try {
    await runtime.waitForLoadEvent(sessionId, timeoutMs, signal);
  } catch (error) {
    if (signal.aborted || isAbortLikeError(error)) {
      throw createRequestAbortedError();
    }

    if (isTimeoutLikeError(error)) {
      throw new BrowserActionError("NAVIGATION_TIMEOUT", "Navigation did not complete within timeout", true, {
        timeout_ms: timeoutMs
      });
    }

    throw toBrowserActionError(error, "NAVIGATION_TIMEOUT", true, {
      timeout_ms: timeoutMs
    });
  }

  throwIfAborted(signal);
}

function normalizeComparableUrl(raw: string): string {
  try {
    return new URL(raw).toString();
  } catch {
    return raw.trim();
  }
}

async function navigationReachedExpectedUrl(
  runtime: BrowserActionRuntime,
  sessionId: string,
  expectedUrl: string
): Promise<boolean> {
  try {
    const history = await runtime.send<{
      currentIndex: number;
      entries: Array<{ id: number; url: string }>;
    }>("Page.getNavigationHistory", {}, sessionId);
    const current = history.entries[history.currentIndex];
    if (!current?.url) {
      return false;
    }

    return normalizeComparableUrl(current.url) === normalizeComparableUrl(expectedUrl);
  } catch {
    return false;
  }
}

async function waitForNavigationOrObservedUrl(
  runtime: BrowserActionRuntime,
  sessionId: string,
  timeoutMs: number,
  signal: AbortSignal,
  expectedUrl: string
): Promise<void> {
  try {
    await waitForNavigationIfConfigured(runtime, sessionId, timeoutMs, signal);
  } catch (error) {
    if (
      error instanceof BrowserActionError &&
      error.code === "NAVIGATION_TIMEOUT" &&
      (await navigationReachedExpectedUrl(runtime, sessionId, expectedUrl))
    ) {
      return;
    }

    throw error;
  }
}

function assertElementWriteSucceeded(response: { result?: { value?: unknown } }, field: FormInputField): void {
  if (response.result?.value !== true) {
    throw new BrowserActionError(
      "ACTION_TARGET_INVALID",
      `Unable to set ${field.kind} value for ref ${field.ref}`,
      true,
      {
        ref_id: field.ref,
        kind: field.kind
      }
    );
  }
}

function normalizeConfirmedFormValue(value: unknown): string | boolean | undefined {
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }

  return undefined;
}

async function readBackFormValue(
  runtime: BrowserActionRuntime,
  node: ResolvedNode,
  field: FormInputField
): Promise<string | boolean | undefined> {
  const response = await runtime.send<{ result?: { value?: unknown } }>(
    "Runtime.callFunctionOn",
    {
      objectId: node.objectId,
      functionDeclaration:
        "function(kind) { const el = this; if (!(el instanceof Element)) return undefined; if (kind === 'checkbox') { return el instanceof HTMLInputElement ? el.checked : undefined; } if (kind === 'file') { if (!(el instanceof HTMLInputElement) || el.type !== 'file') return undefined; const file = el.files && el.files.length > 0 ? el.files[0] : null; return file ? file.name : ''; } if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) { return el.value; } return undefined; }",
      arguments: [{ value: field.kind }],
      returnByValue: true,
      awaitPromise: true
    },
    node.route.sessionId
  );

  return normalizeConfirmedFormValue(response.result?.value);
}

async function validateFileUploadPath(filePath: string, refId: string): Promise<void> {
  if (!isAbsolute(filePath)) {
    throw new BrowserActionError("FILE_PATH_INVALID", `File input for ref ${refId} requires an absolute path`, false, {
      ref_id: refId,
      file_path: filePath
    });
  }

  try {
    await access(filePath, fsConstants.R_OK);
  } catch {
    throw new BrowserActionError("FILE_PATH_INVALID", `File path is not readable: ${filePath}`, false, {
      ref_id: refId,
      file_path: filePath
    });
  }
}

async function installStealthAndConsentScript(runtime: BrowserActionRuntime, sessionId: string): Promise<void> {
  let injectedSessions = _stealthInjectedSessionsByRuntime.get(runtime);
  if (!injectedSessions) {
    injectedSessions = new Set<string>();
    _stealthInjectedSessionsByRuntime.set(runtime, injectedSessions);
  }

  if (injectedSessions.has(sessionId)) {
    return;
  }
  injectedSessions.add(sessionId);
  try {
    await runtime.send("Page.addScriptToEvaluateOnNewDocument", { source: STEALTH_SCRIPT }, sessionId);
  } catch {
    // Non-fatal — page still loads without stealth overrides
  }
}

async function runConsentPreflight(runtime: BrowserActionRuntime, sessionId: string): Promise<void> {
  try {
    await runtime.send(
      "Runtime.evaluate",
      {
        expression: STEALTH_SCRIPT,
        returnByValue: false,
        awaitPromise: false
      },
      sessionId
    );
  } catch {
    // Non-fatal
  }
}

async function ensureStealthAndConsentReady(runtime: BrowserActionRuntime, sessionId: string): Promise<void> {
  await installStealthAndConsentScript(runtime, sessionId);
  await runConsentPreflight(runtime, sessionId);
}

function toTabOperationList(tab: TabRecord): { tab_id: string; target_id: string; status: string } {
  return {
    tab_id: tab.tabId,
    target_id: tab.targetId,
    status: tab.status
  };
}

export async function executeComputerBatch(
  runtime: BrowserActionRuntime,
  tabId: string,
  params: ComputerBatchParams,
  signal: AbortSignal
): Promise<ComputerBatchResult> {
  throwIfAborted(signal);
  const route = getSessionRoute(runtime, tabId);
  const preparedSessions: ComputerBatchPreparedSessions = new Set();
  const results: ComputerBatchResult["steps"] = [];
  let completedSteps = 0;
  let observedJavaScriptDialog: ComputerBatchResult["javascript_dialog"] | undefined;
  let overlayTelemetry: OverlayTelemetry | undefined;

  for (let index = 0; index < params.steps.length; index += 1) {
    const step = params.steps[index];

    try {
      throwIfAborted(signal);
      const outcome = await runComputerStep(runtime, tabId, route, step, params.steps[index + 1], preparedSessions);
      results.push({ index, ok: true });
      completedSteps += 1;
      if (outcome?.overlay) {
        overlayTelemetry = outcome.overlay;
      }
      if (outcome?.javascriptDialog && params.steps[index + 1]?.kind !== "dialog") {
        observedJavaScriptDialog = outcome.javascriptDialog;
        break;
      }
      // Comet-like: 100–200 ms random delay between batch actions
      if (index < params.steps.length - 1) {
        const delayMs = 100 + Math.floor(Math.random() * 101);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new BrowserActionError("REQUEST_ABORTED", "Aborted during inter-action delay", true));
          }, { once: true });
        });
      }
    } catch (error) {
      if (error instanceof BrowserActionError && error.code === "REQUEST_ABORTED") {
        throw error;
      }

      const resolved = toBrowserActionError(error, "ACTION_TARGET_INVALID", true);
      results.push({
        index,
        ok: false,
        error_code: resolved.code
      });
      break;
    }
  }

  const lastCompletedWasClick =
    completedSteps > 0 && params.steps[completedSteps - 1]?.kind === "click";

  let screenshotB64: string | undefined;
  const shouldCaptureScreenshot =
    !observedJavaScriptDialog &&
    (params.steps.some((step) => step.kind === "screenshot") ||
      (completedSteps > 0 && results.length === params.steps.length));
  if (shouldCaptureScreenshot) {
    throwIfAborted(signal);
    // Comet-like: reuse previous screenshot if last batch ended with a click and < 1000 ms ago (LR = 1000)
    const cached = _lastBatchScreenshot.get(tabId);
    const now = Date.now();
    if (cached?.lastWasClick && now - cached.takenAtMs < 1000) {
      screenshotB64 = cached.b64;
    } else {
      screenshotB64 = await captureBatchScreenshot(runtime, route.sessionId);
      _lastBatchScreenshot.set(tabId, { b64: screenshotB64, takenAtMs: Date.now(), lastWasClick: lastCompletedWasClick });
    }
  }

  return {
    steps: results,
    completed_steps: completedSteps,
    ...(screenshotB64 ? { screenshot_b64: screenshotB64 } : {}),
    ...(overlayTelemetry ? { overlay: overlayTelemetry } : {}),
    ...(observedJavaScriptDialog ? { javascript_dialog: observedJavaScriptDialog } : {})
  };
}

/**
 * Omnibox-style URL resolution — mirrors what browsers do when you type in the address bar.
 *
 * Rules (in priority order):
 *  1. Already has a scheme (http://, https://, chrome://, about:, data:, file://, etc.) → use as-is
 *  2. Looks like a hostname / domain (no spaces, contains a dot, valid chars) → prepend https://
 *  3. Looks like localhost[:port] → prepend http://
 *  4. Everything else → Google search URL
 */
export function resolveNavigationUrl(raw: string): string {
  const trimmed = raw.trim();

  // 1 — already has a scheme
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(about|data|javascript|chrome|edge|blob):/i.test(trimmed)) return trimmed;

  // 2 — localhost
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return `http://${trimmed}`;

  // 3 — looks like a hostname: no spaces, has at least one dot, only valid URL chars
  //    e.g. "youtube.com", "en.wikipedia.org/wiki/Foo", "github.com/user/repo"
  if (
    !/\s/.test(trimmed) &&
    /^[a-zA-Z0-9]([a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*)\.[a-zA-Z]{2,}/.test(trimmed)
  ) {
    return `https://${trimmed}`;
  }

  // 4 — bare word or phrase → Google search
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

// Comet isUrlBlocked equivalent — block URLs where the browser opens a non-HTML
// viewer (PDF, image, media) or triggers a file download, so the agent's DOM tools
// return nothing useful. .html/.htm are NOT blocked — those are real web pages.
const BLOCKED_URL_EXTENSIONS = new Set([
  ".pdf",                                                                              // Chrome PDF viewer — no accessible DOM
  ".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt", ".odt", ".ods",                // Office docs — trigger download dialog
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico", ".tiff", ".avif",        // Raw images — browser shows image viewer only
  ".mp4", ".mov", ".avi", ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".webm", ".mkv", // Media — media player, no DOM
  ".zip", ".tar", ".gz", ".7z", ".rar", ".dmg", ".exe", ".pkg",                      // Archives/installers — trigger download
]);

function checkUrlBlocked(url: string, allowSensitiveBrowserPages = false): string | null {
  if (url.startsWith("chrome://")) {
    if (!allowSensitiveBrowserPages) {
      return "This is an internal browser page. Navigate to a regular website instead.";
    }
    return null;
  }
  if (url.startsWith("chrome-extension://")) {
    return "This is an internal browser page. Navigate to a regular website instead.";
  }
  if (url.startsWith("file://") || url.startsWith("view-source:file://")) {
    return "Local filesystem access is blocked. Navigate to a web URL instead.";
  }
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const ext = path.substring(path.lastIndexOf("."));
    if (BLOCKED_URL_EXTENSIONS.has(ext)) {
      return `Navigation to ${ext} files is blocked — this type cannot be interacted with.`;
    }
  } catch {
    // Not a valid URL — let it through (will fail naturally)
  }
  return null;
}

export async function executeNavigate(
  runtime: BrowserActionRuntime,
  tabId: string,
  params: NavigateParams,
  signal: AbortSignal
): Promise<NavigateResult> {
  const route = getSessionRoute(runtime, tabId);
  const timeoutMs = params.timeout_ms ?? DEFAULT_NAVIGATION_TIMEOUT_MS;
  await installStealthAndConsentScript(runtime, route.sessionId);

  if (params.mode === "to") {
    const resolvedUrl = resolveNavigationUrl(params.url ?? "");

    // Comet hard boundary: isUrlBlocked check before navigating
    const blockedReason = checkUrlBlocked(resolvedUrl, params.allow_sensitive_browser_pages === true);
    if (blockedReason) {
      throw new BrowserActionError("NAVIGATION_BLOCKED", blockedReason, false, {
        tab_id: tabId,
        url: resolvedUrl
      });
    }

    if (resolvedUrl.startsWith("chrome://") && params.allow_sensitive_browser_pages === true) {
      if (typeof runtime.navigateSensitivePage !== "function") {
        throw new BrowserActionError("NAVIGATION_BLOCKED", "Sensitive browser page navigation is unavailable in this runtime.", false, {
          tab_id: tabId,
          url: resolvedUrl
        });
      }

      try {
        throwIfAborted(signal);
        const result = await runtime.navigateSensitivePage(tabId, resolvedUrl);
        if (typeof runtime.waitForLoadEvent === "function") {
          await runtime.waitForLoadEvent(route.sessionId, timeoutMs, signal).catch(() => undefined);
        }
        return {
          url: result.url,
          ...(typeof result.title === "string" ? { title: result.title } : {})
        };
      } catch (error) {
        if (error instanceof BrowserActionError) {
          throw error;
        }
        if (signal.aborted || isAbortLikeError(error)) {
          throw createRequestAbortedError();
        }
        throw toBrowserActionError(error, "NAVIGATION_FAILED", false, {
          tab_id: tabId,
          mode: params.mode,
          url: resolvedUrl
        });
      }
    }

    try {
      throwIfAborted(signal);
      const result = await runtime.send<{ frameId?: string; loaderId?: string; errorText?: string }>(
        "Page.navigate",
        { url: resolvedUrl },
        route.sessionId
      );
      if (typeof result.errorText === "string" && result.errorText.length > 0) {
        throw new BrowserActionError("NAVIGATION_FAILED", `Navigation failed: ${result.errorText}`, false, {
          tab_id: tabId,
          mode: params.mode,
          url: resolvedUrl,
          error_text: result.errorText
        });
      }

      throwIfAborted(signal);
      await waitForNavigationOrObservedUrl(runtime, route.sessionId, timeoutMs, signal, resolvedUrl);
      throwIfAborted(signal);

      await runConsentPreflight(runtime, route.sessionId);

      return {
        url: resolvedUrl,
        frame_id: result.frameId,
        loader_id: result.loaderId
      };
    } catch (error) {
      if (error instanceof BrowserActionError) {
        throw error;
      }
      if (signal.aborted || isAbortLikeError(error)) {
        throw createRequestAbortedError();
      }
      throw toBrowserActionError(error, "NAVIGATION_TIMEOUT", true, {
        tab_id: tabId,
        mode: params.mode
      });
    }
  }

  let history;
  try {
    throwIfAborted(signal);
    history = await runtime.send<{ currentIndex: number; entries: Array<{ id: number; url: string }> }>(
      "Page.getNavigationHistory",
      {},
      route.sessionId
    );
  } catch (error) {
    if (signal.aborted || isAbortLikeError(error)) {
      throw createRequestAbortedError();
    }
    throw toBrowserActionError(error, "NAVIGATION_TIMEOUT", true, {
      tab_id: tabId,
      mode: params.mode
    });
  }

  const nextIndex = params.mode === "back" ? history.currentIndex - 1 : history.currentIndex + 1;
  const nextEntry = history.entries[nextIndex];

  if (!nextEntry) {
    throw new BrowserActionError("NO_HISTORY_ENTRY", `No ${params.mode} history entry exists`, false, {
      current_index: history.currentIndex,
      entry_count: history.entries.length
    });
  }

  try {
    throwIfAborted(signal);
    await runtime.send("Page.navigateToHistoryEntry", { entryId: nextEntry.id }, route.sessionId);
    throwIfAborted(signal);
    await waitForNavigationOrObservedUrl(runtime, route.sessionId, timeoutMs, signal, nextEntry.url);
    throwIfAborted(signal);
    await runConsentPreflight(runtime, route.sessionId);
  } catch (error) {
    if (error instanceof BrowserActionError) {
      throw error;
    }
    if (signal.aborted || isAbortLikeError(error)) {
      throw createRequestAbortedError();
    }
    throw toBrowserActionError(error, "NAVIGATION_TIMEOUT", true, {
      tab_id: tabId,
      mode: params.mode,
      entry_id: nextEntry.id
    });
  }

  return {
    url: nextEntry.url
  };
}

export async function executeFormInput(
  runtime: BrowserActionRuntime,
  tabId: string,
  params: FormInputParams,
  signal: AbortSignal
): Promise<FormInputResult> {
  throwIfAborted(signal);
  const route = getSessionRoute(runtime, tabId);
  let updated = 0;
  const applied: NonNullable<FormInputResult["applied"]> = [];
  const preparedSessions: ComputerBatchPreparedSessions = new Set();

  for (const field of params.fields) {
    throwIfAborted(signal);
    const resolvedRef = routeForRef(runtime, tabId, field.ref);
    if (resolvedRef.route.sessionId === route.sessionId) {
      await ensureComputerBatchSessionPrepared(runtime, preparedSessions, resolvedRef.route.sessionId);
    }
    const node = await resolveNodeFromResolvedRef(runtime, resolvedRef, field.ref);

    try {
      if (node.route.sessionId !== route.sessionId) {
        await ensureComputerBatchSessionPrepared(runtime, preparedSessions, node.route.sessionId);
      }
      if (field.kind === "text") {
        await assertTextEntryAllowed(runtime, node, field.ref);
      }

      let result: { result?: { value?: unknown } };
      if (field.kind === "file") {
        await validateFileUploadPath(field.value as string, field.ref);
        await runtime.send(
          "DOM.setFileInputFiles",
          {
            files: [field.value as string],
            backendNodeId: node.backendNodeId,
            objectId: node.objectId
          },
          node.route.sessionId
        );
        result = await runtime.send<{ result?: { value?: unknown } }>(
          "Runtime.callFunctionOn",
          {
            objectId: node.objectId,
            functionDeclaration:
              "function() { const el = this; if (!(el instanceof HTMLInputElement) || el.type !== 'file') return false; const count = el.files ? el.files.length : 0; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return count > 0; }",
            returnByValue: true,
            awaitPromise: true
          },
          node.route.sessionId
        );
      } else {
        result = await runtime.send<{ result?: { value?: unknown } }>(
          "Runtime.callFunctionOn",
          {
            objectId: node.objectId,
            functionDeclaration:
              "function(kind, rawValue) { const el = this; if (!(el instanceof Element)) return false; if (kind === 'checkbox') { if (!(el instanceof HTMLInputElement)) return false; el.checked = Boolean(rawValue); } else if (kind === 'select') { if (!(el instanceof HTMLSelectElement)) return false; const incoming = String(rawValue); const options = Array.from(el.options); const matched = options.find((option) => option.value === incoming || option.text === incoming); if (!matched) return false; el.value = matched.value; } else { if (el instanceof HTMLSelectElement) { const incoming = String(rawValue); const options = Array.from(el.options); const matched = options.find((option) => option.value === incoming || option.text === incoming); if (!matched) return false; el.value = matched.value; } else { if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false; el.value = String(rawValue); } } el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; }",
            arguments: [{ value: field.kind }, { value: field.value }],
            returnByValue: true,
            awaitPromise: true
          },
          node.route.sessionId
        );
      }

      assertElementWriteSucceeded(result, field);
      const confirmedValue = await readBackFormValue(runtime, node, field);
      updated += 1;
      applied.push({
        ref: field.ref,
        kind: field.kind,
        requested_value: field.value,
        ...(confirmedValue !== undefined ? { confirmed_value: confirmedValue } : {})
      });
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
        ref_id: field.ref,
        kind: field.kind
      });
    }
  }

  return { updated, applied };
}

export async function executeTabOperation(
  runtime: BrowserActionRuntime,
  tabId: string,
  params: TabOperationParams,
  signal: AbortSignal
): Promise<TabOperationResult> {
  throwIfAborted(signal);

  if (params.operation === "list") {
    const tabs = runtime.listTabs();

    // Enrich with URL + title from Target.getTargets so the agent can describe tabs meaningfully
    let targetUrlMap: Map<string, { url: string; title: string }> = new Map();
    try {
      const { targetInfos } = await runtime.send<{ targetInfos: Array<{ targetId: string; url: string; title: string; type: string }> }>(
        "Target.getTargets", {}
      );
      for (const t of targetInfos ?? []) {
        targetUrlMap.set(t.targetId, { url: t.url ?? "", title: t.title ?? "" });
      }
    } catch {}

    return {
      tabs: tabs.map((tab) => {
        const info = targetUrlMap.get(tab.targetId);
        return {
          tab_id: tab.tabId,
          target_id: tab.targetId,
          status: tab.status,
          url: info?.url ?? "",
          title: info?.title ?? ""
        };
      })
    };
  }

  if (params.operation === "create") {
    try {
      const createResult = await runtime.send<{ targetId: string }>("Target.createTarget", {
        url: params.url ?? "about:blank"
      });

      if (!runtime.attachTab) {
        return {
          tab_id: createResult.targetId,
          status: "ok"
        };
      }

      const attached = await runtime.attachTab(createResult.targetId);
      if (runtime.enableDomains) {
        await runtime.enableDomains(attached.tabId);
      }
      if (runtime.refreshFrameTree) {
        await runtime.refreshFrameTree(attached.tabId);
      }

      return {
        tab_id: attached.tabId,
        status: "ok"
      };
    } catch (error) {
      throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
        operation: params.operation
      });
    }
  }

  const targetTabId = params.target_tab_id ?? tabId;
  const targetTab = runtime.getTab(targetTabId);
  if (!targetTab) {
    throw new BrowserActionError("TAB_NOT_FOUND", `Tab ${targetTabId} is not registered`, false, {
      tab_id: targetTabId
    });
  }

  try {
  
  // ── Tab grouping (CDP-native, Chrome 89+) ───────────────────────────
  if (params.operation === "group") {
    const groupingTabIds = params.tab_ids ?? [tabId];
    if (!runtime.groupTabs) {
      throw new BrowserActionError("TAB_GROUPING_UNAVAILABLE", "Tab grouping is not available in this runtime", false);
    }
    const grouped = await runtime.groupTabs(groupingTabIds, {
      groupName: params.group_name,
      groupColor: params.group_color
    });
    return {
      tab_id: tabId,
      status: "ok",
      group_name: grouped.groupName,
      grouped_tabs: grouped.tabIds
    };
  }

  if (params.operation === "ungroup") {
    const ungroupingTabIds = params.tab_ids?.length ? params.tab_ids : [params.target_tab_id ?? tabId];
    if (!runtime.ungroupTabs) {
      throw new BrowserActionError("TAB_GROUPING_UNAVAILABLE", "Tab ungrouping is not available in this runtime", false);
    }
    await runtime.ungroupTabs(ungroupingTabIds);
    return {
      tab_id: params.target_tab_id ?? tabId,
      status: "ok"
    };
  }

  if (params.operation === "activate") {
      await runtime.send("Target.activateTarget", { targetId: targetTab.targetId });
    } else {
      const closeResult = await runtime.send<{ success?: boolean }>("Target.closeTarget", { targetId: targetTab.targetId });
      if (closeResult.success !== true) {
        throw new BrowserActionError("TARGET_CLOSE_FAILED", `Target close failed for tab ${targetTabId}`, false, {
          tab_id: targetTabId
        });
      }
      runtime.invalidateTab?.(targetTabId);
    }
  } catch (error) {
    if (error instanceof BrowserActionError) {
      throw error;
    }
    throw toBrowserActionError(error, "ACTION_TARGET_INVALID", true, {
      operation: params.operation,
      tab_id: targetTabId
    });
  }

  return {
    tab_id: targetTabId,
    status: "ok"
  };
}

export async function executeExtensionOperation(
  runtime: BrowserActionRuntime,
  _tabId: string,
  params: ExtensionOperationParams,
  signal: AbortSignal
): Promise<ExtensionOperationResult> {
  throwIfAborted(signal);

  if (!runtime.manageExtensions) {
    throw new BrowserActionError("EXTENSION_MANAGEMENT_UNAVAILABLE", "Extension management is not available in this runtime", false);
  }

  try {
    return await runtime.manageExtensions(params);
  } catch (error) {
    if (error instanceof BrowserActionError) {
      throw error;
    }

    throw toBrowserActionError(error, "EXTENSION_MANAGEMENT_FAILED", false, {
      operation: params.operation,
      extension_id: params.extension_id
    });
  }
}
