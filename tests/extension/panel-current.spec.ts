/**
 * Tests for the CURRENT panel implementation (panel.js + styles.css).
 * These verify real wired-in behaviors — not the old command-bar shell.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const panelJs  = readFileSync(path.join(ROOT, "extension", "panel.js"),   "utf8");
const css      = readFileSync(path.join(ROOT, "extension", "styles.css"), "utf8");
const bgJs     = readFileSync(path.join(ROOT, "extension", "background.js"), "utf8");
const manifest = JSON.parse(readFileSync(path.join(ROOT, "extension", "manifest.json"), "utf8"));

// ─── panel.js structural checks ─────────────────────────────────────────────
describe("panel.js — DOM structure", () => {
  it("builds UI via buildUI() into #root", () => {
    expect(panelJs).toContain("function buildUI(root)");
    expect(panelJs).toContain("function buildPanelShellMarkup()");
    expect(panelJs).toContain('getElementById("root")');
    expect(panelJs).toContain("buildUI(root)");
  });

  it("has the composer with prompt-input, direct settings access, and the current accessibility contract", () => {
    expect(panelJs).toContain('id="prompt-input"');
    expect(panelJs).toContain('id="settings-btn"');
    expect(panelJs).toContain('id="empty-reconnect-btn"');
    expect(panelJs).toContain('const FULL_PROMPT_PLACEHOLDER = "Ask anything...";');
    expect(panelJs).toContain('const PROMPT_ARIA_LABEL = "Ask anything";');
    expect(panelJs).toContain('id="btn-send"');
    expect(panelJs).toContain('id="btn-plus"');
    expect(panelJs).toContain('id="btn-model"');
    expect(panelJs).toContain('id="btn-mic"');
  });

  it("derives task capability hints before resolving the auto model", () => {
    expect(panelJs).toContain("buildTaskCapabilityRequest");
    expect(panelJs).toContain("const capabilityRequest = buildTaskCapabilityRequest(");
    expect(panelJs).toContain("const { provider, model, apiKey, baseUrl } = await resolveProvider(capabilityRequest);");
  });

  it("includes prior chat turns in follow-up AgentRun payloads", () => {
    expect(panelJs).toContain("function buildHistoryMessages(store, sessionId)");
    expect(panelJs).toContain("historyMessages = buildHistoryMessages(sessionStore, activeSessionId);");
    expect(panelJs).toContain("history_messages: historyMessages");
  });

  it("stores session message timestamps as ISO strings", () => {
    expect(panelJs).toContain("function nowIso()");
    expect(panelJs).toContain('ts: nowIso()');
  });

  it("resolves recent chats and mention tokens through explicit helpers", () => {
    expect(panelJs).toContain("function getSortedSessions(store)");
    expect(panelJs).toContain("function getTrailingAtQuery(text, cursor = text.length)");
    expect(panelJs).toContain("function insertAtMentionToken(input, label)");
    expect(panelJs).toContain("function expandMentionTokens(text)");
  });

  it("has scroll FAB", () => {
    expect(panelJs).toContain('id="scroll-fab"');
    expect(panelJs).toContain("setupScrollFab");
  });

  it("has toast container", () => {
    expect(panelJs).toContain('id="toast-container"');
    expect(panelJs).toContain("function showToast");
  });

  it("has connection status bar", () => {
    expect(panelJs).toContain('id="conn-bar"');
    expect(panelJs).toContain("function setConnStatus");
  });

  it("includes a structured email draft card helper and insert actions", () => {
    expect(panelJs).toContain("function deriveDraftInsertState");
    expect(panelJs).toContain("function buildEmailDraftCardMarkup");
    expect(panelJs).toContain("ATLAS_GET_INSERT_CONTEXT");
    expect(panelJs).toContain("ATLAS_INSERT_DRAFT");
    expect(panelJs).toContain("Refocus page fields");
  });
});

// ─── Screenshot button ───────────────────────────────────────────────────────
describe("screenshot button", () => {
  it("panel.js sends captureScreenshot message", () => {
    expect(panelJs).toContain('action: "captureScreenshot"');
  });

  it("panel.js handles resp.error and shows a toast instead of silently failing", () => {
    // Must check for resp.error before trying to use resp.dataUrl
    expect(panelJs).toContain("resp?.error");
    expect(panelJs).toContain("Screenshot failed:");
  });

  it("background.js uses getLastFocused to resolve windowId for captureVisibleTab", () => {
    expect(bgJs).toContain("getLastFocused");
    expect(bgJs).toContain("captureVisibleTab");
    // Must not pass bare null as windowId (the old broken pattern)
    expect(bgJs).not.toContain("captureVisibleTab(null,");
  });

  it("background.js returns true to keep message channel open for async response", () => {
    expect(bgJs).toContain('return true;');
  });

  it("background.js supports benchmark tab registration, grouping, and teardown", () => {
    expect(bgJs).toContain("ATLAS_BENCHMARK_REGISTER");
    expect(bgJs).toContain("ATLAS_BENCHMARK_FINALIZE");
    expect(bgJs).toContain("chrome.tabs.group");
    expect(bgJs).toContain("chrome.tabGroups.update");
    expect(bgJs).toContain("chrome.tabs.remove");
  });
});

describe("insertable draft wiring", () => {
  it("manifest injects the page target tracker on web pages", () => {
    const scripts = manifest.content_scripts.flatMap((entry: { js?: string[] }) => entry.js ?? []);
    expect(scripts).toContain("content/page-targets.js");
  });

  it("background.js tracks insert context updates and routes insert requests", () => {
    expect(bgJs).toContain("ATLAS_INSERT_CONTEXT_UPDATE");
    expect(bgJs).toContain("ATLAS_GET_INSERT_CONTEXT");
    expect(bgJs).toContain("ATLAS_INSERT_DRAFT");
    expect(bgJs).toContain("ATLAS_INSERT_CONTEXT_CHANGED");
  });

  it("CSS contains the draft card surface", () => {
    expect(css).toContain(".draft-card");
    expect(css).toContain(".draft-card-actions");
    expect(css).toContain(".draft-card-status");
  });
});

// ─── Overlay animations ──────────────────────────────────────────────────────
describe("overlay animations", () => {
  it("setOverlay sets data-state=closed before hiding (exit animation)", () => {
    expect(panelJs).toContain('panel.dataset.state = "closed"');
  });

  it("setOverlay sets data-state=open when showing (enter animation)", () => {
    expect(panelJs).toContain('panel.dataset.state = "open"');
  });

  it("overlay close has timeout fallback so it can't get stuck", () => {
    expect(panelJs).toContain("clearTimeout(t)");
    // 180ms fallback timeout
    expect(panelJs).toMatch(/setTimeout\(cleanup,\s*180\)/);
  });

  it("CSS has data-state=closed animation for .overlay-panel", () => {
    expect(css).toContain('.overlay-panel[data-state=closed]');
    expect(css).toContain('slideDownAndFadeOut');
  });
});

describe("composer visibility", () => {
  it("keeps the composer fade light enough not to darken the last chat lines", () => {
    expect(css).toContain(".composer-blur");
    expect(css).toContain("height: 20px;");
    expect(css).toContain("color-mix(in oklab, var(--bg) 32%, transparent)");
  });
});

// ─── Smooth scroll ───────────────────────────────────────────────────────────
describe("smooth scroll", () => {
  it("scrollToBottom uses scrollTo with behavior:smooth instead of raw scrollTop assignment", () => {
    expect(panelJs).toContain('behavior: "smooth"');
    // Should NOT use the instant assignment for primary scroll path
    expect(panelJs).toContain("stage.scrollTo(");
  });

  it("CSS stage has scroll-behavior: smooth", () => {
    expect(css).toContain("scroll-behavior: smooth");
  });

  it("restoreSession uses scrollToBottom(false) to avoid animating history load", () => {
    expect(panelJs).toContain("scrollToBottom(false)");
  });

  it("restoreSession persists the chosen active session into storage", () => {
    expect(panelJs).toContain("activeSessionId = session.id;");
    expect(panelJs).toContain("chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore })");
  });
});

describe("@ mention palette", () => {
  it("shows searchable tab results instead of injecting raw page text into the composer", () => {
    expect(panelJs).toContain("renderAtPalette(panel, _atToken)");
    expect(panelJs).toContain("tabs = await chrome.tabs.query({ currentWindow: true, url: [\"http://*/*\", \"https://*/*\"] })");
    expect(panelJs).toContain("mentionLabel");
    expect(panelJs).toContain('const token = `@[${label}]`;');
  });

  it("expands current-page and all-tabs mention tokens only at send time", () => {
    expect(panelJs).toContain('if (normalized === "current page")');
    expect(panelJs).toContain('if (normalized === "all open tabs")');
    expect(panelJs).toContain("const resolvedPromptText = await expandMentionTokens(text);");
  });
});

// ─── Send button micro-animation ─────────────────────────────────────────────
describe("send button state transition", () => {
  it("transitionState applies scale+opacity pop animation on icon swap", () => {
    expect(panelJs).toContain('btn.style.transform = "scale(0.82)"');
    expect(panelJs).toContain('btn.style.opacity   = "0.6"');
  });

  it("transitionState uses double-rAF to reset so CSS transition plays", () => {
    expect(panelJs).toContain("requestAnimationFrame(() => requestAnimationFrame");
  });
});

// ─── Scroll FAB ──────────────────────────────────────────────────────────────
describe("scroll FAB", () => {
  it("FAB hides with scaleAndFadeOut animation (not instant)", () => {
    expect(panelJs).toContain("scaleAndFadeOut");
    expect(panelJs).toContain("hideFab");
  });

  it("CSS has scaleAndFadeOut keyframe", () => {
    expect(css).toContain("@keyframes scaleAndFadeOut");
  });
});

// ─── New chat fade ───────────────────────────────────────────────────────────
describe("new chat transition", () => {
  it("newChat fades thread to opacity 0 before clearing", () => {
    expect(panelJs).toContain("thread.style.opacity");
    expect(panelJs).toContain('"0"');
  });

  it("newChat uses transitionend event to clear after fade", () => {
    expect(panelJs).toContain("transitionend");
  });

  it("newChat resets run state after clearing the thread", () => {
    expect(panelJs).toContain("currentRunId = null");
    expect(panelJs).toContain("currentAiEl = null");
    expect(panelJs).toContain('streamBuffer = ""');
    expect(panelJs).toContain("currentRunState = null");
  });
});

// ─── will-change GPU hints ───────────────────────────────────────────────────
describe("CSS GPU acceleration", () => {
  it("gamma eyes have will-change for smooth animations", () => {
    expect(css).toMatch(/\.gamma-eye-l[^}]*will-change:/);
    expect(css).toMatch(/\.gamma-eye-r[^}]*will-change:/);
  });

  it("stream cursor has will-change", () => {
    expect(css).toMatch(/\.stream-cursor[^}]*will-change:/);
  });

  it("action-slot has will-change (set on element level)", () => {
    // will-change is either on .action-slot or .action-item (both names used)
    const hasIt = /\.action-slot[^}]*will-change:/.test(css) || /\.action-item[^}]*will-change:/.test(css);
    expect(hasIt).toBe(true);
  });
});

// ─── Progress bar animations ─────────────────────────────────────────────────
describe("CSS progress bar animations", () => {
  it("has @keyframes indeterminate for bouncing progress bar", () => {
    expect(css).toContain("@keyframes indeterminate");
  });

  it("has @keyframes indicator for streaming stripe animation", () => {
    expect(css).toContain("@keyframes indicator");
  });

  it("has .progress-bar and .progress-bar-fill classes", () => {
    expect(css).toContain(".progress-bar");
    expect(css).toContain(".progress-bar-fill");
  });
});

// ─── Texture / animation system ──────────────────────────────────────────────
describe("CSS animation system completeness", () => {
  it("has all Comet easing variables", () => {
    expect(css).toContain("--ease-out-expo");
    expect(css).toContain("--ease-in-expo");
    expect(css).toContain("--ease-out-soft");
    expect(css).toContain("--ease-out-cubic");
  });

  it("has all Gamma state animations", () => {
    expect(css).toContain("gamma-thinking");
    expect(css).toContain("gamma-scanning");
    expect(css).toContain("gamma-streaming");
    expect(css).toContain("gamma-error");
    expect(css).toContain("gamma-done");
  });

  it("has action-slot shimmer sweep", () => {
    expect(css).toContain("@keyframes _action-shimmer");
    expect(css).toContain(".action-slot:not(.done)::after");
  });

  it("has slot-machine text animation", () => {
    expect(css).toContain("@keyframes _slot-in");
    expect(css).toContain("@keyframes _slot-out");
    expect(css).toContain(".action-slot-text");
  });

  it("has shimmer skeleton loader", () => {
    expect(css).toContain("@keyframes shimmer");
    expect(css).toContain(".shimmer");
  });

  it("has @property --conic-angle CSS Houdini for rotating gradient", () => {
    expect(css).toContain("@property --conic-angle");
    expect(css).toContain("@keyframes conic-spin");
  });
});

// ─── Attachment chip animation ───────────────────────────────────────────────
describe("attachment chip entry animation", () => {
  it("CSS attachment-chip has entry animation", () => {
    expect(css).toMatch(/\.attachment-chip[^}]*slideUpAndFadeIn/);
  });
});

// ─── Textarea smooth resize ──────────────────────────────────────────────────
describe("textarea smooth resize", () => {
  it("#prompt-input has height transition for smooth auto-resize", () => {
    expect(css).toMatch(/#prompt-input[^}]*transition:[^}]*height/);
  });
});
