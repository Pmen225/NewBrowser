// panel.js — Atlas Assistant Panel (P1+P2+P3 complete)
// RPC: ws://127.0.0.1:3210/rpc   SSE: http://127.0.0.1:3210/events
import { createPanelRpcClient } from "./lib/rpc.js";
import {
  normalizeModelConfig, normalizeModelCatalog, normalizeModelBenchmarkManifest, chooseAutoModel, buildTaskCapabilityRequest,
  MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY, MODEL_BENCHMARK_STORAGE_KEY
} from "./lib/model-config.js";
import { OVERLAY_NONE, normalizeOverlayKind, toggleOverlay } from "./lib/overlay-controller.js";
import { listMatchingShortcuts, SHORTCUTS_STORAGE_KEY } from "./lib/shortcuts.js";
import { readImportedAttachments, buildAttachmentPromptPrefix } from "./lib/file-import.js";
import { createAudioRecorderController, isAudioRecordingSupported } from "./lib/speech.js";
import { overlayPhaseForTool } from "./lib/atlas-overlay-state.js";
import { buildMemoryContextItems, loadMemoryStore } from "./lib/memory.js";
import { getCapturableActiveTab, hasAccessibleWebTab, isPageContextPrompt, normalizePanelErrorMessage } from "./lib/page-context.js";
import { buildMissingProviderSessionMessage, resolveProviderSelection } from "./lib/provider-resolution.js";
import {
  normalizeChatSessionsStore, ensureActiveSession,
  appendSessionMessage, pruneChatSessions, CHAT_SESSIONS_STORAGE_KEY
} from "./lib/recent-chats.js";
import { readUnlockedProviders } from "./lib/provider-session.js";
import { loadPanelSettings, PANEL_SETTINGS_STORAGE_KEY } from "./lib/panel-settings.js";
import { resolveTranscriptionConfig } from "./lib/transcription-config.js";

const SIDECAR_WS   = "ws://127.0.0.1:3210";
const EVENTS_URL   = "http://127.0.0.1:3210/events";
const FULL_PROMPT_PLACEHOLDER = "Ask anything...";
const PROMPT_ARIA_LABEL = "Ask anything";
const EMPTY_DEFAULT_COPY = "What can I help with?";
const OFFLINE_EMPTY_COPY = "Sidecar offline. Start local dev, then reconnect.";
const RECONNECT_BUSY_LABEL = "Reconnecting...";

// Returns the active web tab (http/https), skipping the side panel itself.
async function getActiveWebTab() {
  return getCapturableActiveTab((queryInfo) => chrome.tabs.query(queryInfo));
}

// ═══════════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════════
const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildHistoryMessages(store, sessionId) {
  const normalizedStore = normalizeChatSessionsStore(store);
  const targetSession = normalizedStore.sessions.find((session) => session.id === sessionId);
  if (!targetSession) {
    return [];
  }

  return targetSession.messages
    .filter((message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.text === "string" &&
      message.text.trim().length > 0
    )
    .map((message) => ({
      role: message.role,
      text: message.text.trim()
    }));
}

function nowIso() {
  return new Date().toISOString();
}

function getSortedSessions(store) {
  return normalizeChatSessionsStore(store).sessions
    .slice()
    .sort((left, right) => (right.updatedAt || right.createdAt || "").localeCompare(left.updatedAt || left.createdAt || ""));
}

function getTrailingAtQuery(text, cursor = text.length) {
  const source = String(text ?? "");
  const limit = typeof cursor === "number" && Number.isFinite(cursor) ? cursor : source.length;
  const uptoCursor = source.slice(0, limit);
  const atPos = uptoCursor.lastIndexOf("@");
  if (atPos < 0) {
    return null;
  }
  const before = atPos === 0 ? "" : uptoCursor[atPos - 1];
  if (before && !/\s/.test(before)) {
    return null;
  }
  const token = uptoCursor.slice(atPos + 1);
  if (token.includes("\n") || token.includes("]")) {
    return null;
  }
  return {
    start: atPos,
    end: limit,
    query: token.trimStart()
  };
}

function insertAtMentionToken(input, label) {
  const range = getTrailingAtQuery(input.value, input.selectionStart ?? input.value.length);
  if (!range) {
    return false;
  }
  const token = `@[${label}]`;
  input.value = `${input.value.slice(0, range.start)}${token}${input.value.slice(range.end)}`;
  const caret = range.start + token.length;
  input.setSelectionRange(caret, caret);
  autoResize(input);
  input.focus();
  return true;
}

async function expandMentionTokens(text) {
  const source = typeof text === "string" ? text : "";
  if (!source.includes("@[")) {
    return source;
  }

  let activeTab = null;
  let openTabs = [];
  try {
    activeTab = await getActiveWebTab();
    openTabs = await chrome.tabs.query({ currentWindow: true, url: ["http://*/*", "https://*/*"] });
  } catch {}

  const tabsByTitle = new Map();
  for (const tab of openTabs) {
    const title = typeof tab.title === "string" ? tab.title.trim() : "";
    if (!title) {
      continue;
    }
    const key = title.toLowerCase();
    const entries = tabsByTitle.get(key) ?? [];
    entries.push(tab);
    tabsByTitle.set(key, entries);
  }

  return source.replace(/@\[(.+?)\]/g, (full, rawLabel) => {
    const label = String(rawLabel ?? "").trim();
    if (!label) {
      return full;
    }
    const normalized = label.toLowerCase();
    if (normalized === "current page") {
      return `[page: "${activeTab?.title ?? "page"}" — ${activeTab?.url ?? ""}]`;
    }
    if (normalized === "all open tabs") {
      const tabList = openTabs.map((tab) => `${tab.title ?? "Tab"} — ${tab.url ?? ""}`).join("\n");
      return tabList ? `[tabs:\n${tabList}\n]` : "[tabs]";
    }
    const matches = tabsByTitle.get(normalized) ?? [];
    if (matches.length === 1) {
      const match = matches[0];
      return `[page: "${match.title ?? label}" — ${match.url ?? ""}]`;
    }
    return full;
  });
}

// ═══════════════════════════════════════════════════════════════════
// SVG library
// ═══════════════════════════════════════════════════════════════════
function svgGamma(cls = "") {
  return `<svg class="gamma-container ${cls}" viewBox="0 0 500 272" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse class="gamma-eye-l" cx="204.546" cy="136.363" rx="57.273" ry="57.273" fill="currentColor"/>
    <ellipse class="gamma-eye-r" cx="295.454" cy="136.363" rx="57.273" ry="57.273" fill="currentColor"/>
    <polyline class="gamma-check" points="155,148 200,190 330,95" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

const SVG = {
  newChat:     `<svg viewBox="0 0 16 16" fill="none"><path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 16 16" fill="none"><path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send:        `<svg viewBox="0 0 16 16" fill="none"><path d="M13.5 8L3 3l2.5 5L3 13l10.5-5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  stop:        `<svg viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  globe:       `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 2c-2 2-2 8 0 12M8 2c2 2 2 8 0 12M2 8h12" stroke="currentColor" stroke-width="1.1"/></svg>`,
  check:       `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cursor:      `<svg viewBox="0 0 16 16" fill="none"><path d="M4 2l8 6-4 1-1 4-3-11z" fill="currentColor"/></svg>`,
  search:      `<svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  code:        `<svg viewBox="0 0 16 16" fill="none"><path d="M5 4L1 8l4 4M11 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  warning:     `<svg viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  plus:        `<svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  mic:         `<svg viewBox="0 0 16 16" fill="none"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 7.5a5.5 5.5 0 0011 0M8 15v-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  dotsThree:   `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></svg>`,
  camera:      `<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="9.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 5l1-2h2l1 2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  paperclip:   `<svg viewBox="0 0 16 16" fill="none"><path d="M13 7.5l-5.5 5.5a3.5 3.5 0 01-5-5l6-6a2 2 0 013 3l-5.5 5.5a.5.5 0 01-.7-.7L10.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  slash:       `<svg viewBox="0 0 16 16" fill="none"><path d="M10 2L6 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  atSign:      `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 8V6.5a2.5 2.5 0 00-5 0V8a5 5 0 109.5-2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  xMark:       `<svg viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  clock:       `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  gear:        `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5v1.5M8 13v1.5M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M1.5 8H3M13 8h1.5M3.3 12.7l1.1-1.1M11.6 4.4l1.1-1.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  flash:       `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z"/></svg>`,
  mail:        `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.6" stroke="currentColor" stroke-width="1.3"/><path d="M3 5.5l5 4 5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// Tool name → icon
const TOOL_ICONS = {
  navigate:      SVG.globe,
  computer:      SVG.cursor,
  read_page:     SVG.search,
  find:          SVG.search,
  get_page_text: SVG.search,
  search_web:    SVG.globe,
  form_input:    SVG.code,
  tabs_create:   SVG.newChat,
  draft_email:   SVG.mail,
  todo_write:    SVG.check,
};

// ═══════════════════════════════════════════════════════════════════
// Built-in slash shortcuts
// ═══════════════════════════════════════════════════════════════════
const BUILTIN_SHORTCUTS = [
  { id: "bi:summarize",  trigger: "/summarize",  label: "Summarise",   instructions: "Summarise this page for me",                         isBuiltIn: true },
  { id: "bi:explain",    trigger: "/explain",    label: "Explain",     instructions: "Explain what this page is about",                     isBuiltIn: true },
  { id: "bi:search",     trigger: "/search",     label: "Web search",  instructions: "Search the web for: ",                               isBuiltIn: true },
  { id: "bi:screenshot", trigger: "/screenshot", label: "Screenshot",  instructions: "Take a screenshot and describe what you see",         isBuiltIn: true },
  { id: "bi:todo",       trigger: "/todo",       label: "Todo list",   instructions: "Create a todo list for tasks on this page",           isBuiltIn: true },
  { id: "bi:fill",       trigger: "/fill",       label: "Fill form",   instructions: "Find and fill out the form on this page",             isBuiltIn: true },
];

// ═══════════════════════════════════════════════════════════════════
// DOM build
// ═══════════════════════════════════════════════════════════════════
export function buildPanelShellMarkup() {
  return `
<div class="assistant-shell">
  <header class="panel-header">
    <div class="panel-header-brand">
      <button class="icon-btn panel-back-btn" id="btn-settings-back" title="Back" aria-label="Back" hidden>${SVG.chevronLeft}</button>
      <div class="brand-icon" id="panel-brand-icon">${svgGamma("")}</div>
      <span id="panel-header-title">Assistant</span>
    </div>
    <div class="panel-header-actions" id="panel-header-actions-main">
      <div class="kebab-wrap">
        <button class="icon-btn" id="btn-new-chat" title="Open menu" aria-label="Open menu">${SVG.newChat}</button>
        <div id="kebab-menu" class="overlay-panel kebab-menu" hidden></div>
      </div>
    </div>
  </header>

  <div class="assistant-main-view" id="assistant-main-view">
    <div id="conn-bar" class="conn-bar" hidden>
      <span class="conn-dot" id="conn-dot"></span>
      <span id="conn-label">Connecting…</span>
    </div>

    <div class="stage-wrap">
      <div class="stage" id="stage">
        <div class="empty-state" id="empty-state">
          <p class="empty-title">${EMPTY_DEFAULT_COPY}</p>
          <div class="suggested-chips" id="chips">
            <button class="chip" data-prompt="Summarise this page for me">✦ Summarise</button>
            <button class="chip" data-prompt="What can I do on this page?">What can I do here?</button>
            <button class="chip" data-prompt="Tell me more about this page">Learn more</button>
            <button class="chip" data-prompt="Find the main call to action on this page">Find CTA</button>
          </div>
          <button class="empty-reconnect-btn" id="empty-reconnect-btn" type="button" hidden>Reconnect to sidecar</button>
        </div>
        <div class="thread" id="thread" hidden></div>
      </div>
      <button class="scroll-fab" id="scroll-fab" hidden title="Scroll to bottom" aria-label="Scroll to bottom">${SVG.chevronDown}</button>
    </div>

    <div class="composer-wrap">
      <div class="composer-blur"></div>
      <div id="overlay-panel" class="overlay-panel composer-overlay" hidden></div>
      <div class="composer" id="composer">
        <div id="attachment-preview" class="attachment-preview" hidden></div>
        <textarea id="prompt-input" rows="1" placeholder="${FULL_PROMPT_PLACEHOLDER}" autocomplete="off" spellcheck="true" aria-label="${PROMPT_ARIA_LABEL}"></textarea>
        <div class="composer-dock">
          <button id="btn-plus" class="dock-btn dock-btn--icon" title="Add content" aria-label="Add content">${SVG.plus}</button>
          <div class="dock-right">
            <button id="btn-model" class="dock-btn dock-btn--pill" title="Select model" aria-label="Select model">
              <span id="model-label">Auto</span>
              ${SVG.chevronDown}
            </button>
            <button id="btn-mic" class="dock-btn dock-btn--icon" title="Voice input" aria-label="Voice input" hidden>${SVG.mic}</button>
            <button id="btn-send" title="Send" aria-label="Send">${SVG.send}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <section class="settings-view" id="settings-view" hidden>
    <iframe id="settings-frame" class="settings-frame" title="Settings"></iframe>
  </section>

  <div class="toast-container" id="toast-container"></div>
</div>`;
}

function buildUI(root) {
  root.innerHTML = buildPanelShellMarkup();
}

// ═══════════════════════════════════════════════════════════════════
// Markdown renderer (full)
// ═══════════════════════════════════════════════════════════════════
function renderMarkdown(raw) {
  let text = raw
    .replace(/<\/?answer>/gi, "")
    .replace(/<confirmation[^>]*\/?>/gi, "")
    .replace(/\[(web|screenshot|image):\d+\]/g, "")
    .trim();
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${esc(code.trim())}</code></pre>`);
  text = text.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  text = text.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]+?<\/li>)+/g, (m) => `<ul>${m}</ul>`);
  text = text.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  text = text.replace(
    /(?<![">])(https?:\/\/[^\s<>,"']+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  text = text.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>");
  return `<p>${text}</p>`;
}

export function deriveTerminalRunSnapshot(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const status = payload.status;
  if (status !== "completed" && status !== "failed" && status !== "stopped") {
    return null;
  }

  const rawAnswer =
    typeof payload.final_answer === "string"
      ? payload.final_answer
      : typeof payload.content === "string"
        ? payload.content
        : "";

  const sources = Array.isArray(payload.sources)
    ? payload.sources
    : Array.isArray(payload.citations)
      ? payload.citations
      : [];

  return {
    status,
    rawText: rawAnswer.replace(/<\/?answer>/gi, "").trim(),
    errorMessage: typeof payload.error_message === "string" ? payload.error_message : "",
    isStopped: status === "stopped",
    draftArtifact: payload.draft_artifact,
    sources
  };
}

function stripAnswerEnvelope(raw) {
  return typeof raw === "string" ? raw.replace(/<\/?answer>/gi, "").trim() : "";
}

function normalizeTaskPayload(task) {
  if (!task || typeof task !== "object") {
    return null;
  }

  const children = Array.isArray(task.children) ? task.children.filter((value) => typeof value === "string") : [];
  return {
    taskId: typeof task.task_id === "string" ? task.task_id : "",
    role: typeof task.role === "string" ? task.role : "primary",
    visibility: typeof task.visibility === "string" ? task.visibility : "panel",
    children,
    activeChildTaskId: typeof task.active_child_task_id === "string" ? task.active_child_task_id : "",
    childSummary: stripAnswerEnvelope(task.child_summary),
    childError: typeof task.child_error === "string" ? task.child_error : null
  };
}

export function deriveTaskStatusMeta(task) {
  if (!task) {
    return null;
  }

  const children = Array.isArray(task.children) ? task.children : [];
  const childCount = children.length;
  const chips = [];
  chips.push(task.role === "subagent" ? "Worker" : "Primary");
  chips.push(task.visibility === "hidden" ? "Hidden" : "Panel");
  if (childCount > 0) {
    chips.push(`${childCount} hidden worker${childCount === 1 ? "" : "s"}`);
  }
  if (task.activeChildTaskId) {
    chips.push("Delegating");
  } else if (task.childError) {
    chips.push("Needs review");
  } else if (task.childSummary) {
    chips.push("Returned");
  }

  let description = task.role === "subagent"
    ? "Running as a delegated worker for the active task."
    : "Keeping this page live while the agent works.";

  if (task.activeChildTaskId) {
    description = "Delegating a hidden worker while keeping this page live.";
  } else if (task.childError) {
    description = "A delegated worker hit a problem and returned control here.";
  } else if (task.childSummary) {
    description = "A delegated worker returned with an update.";
  }

  return {
    description,
    chips,
    summary: task.childSummary || "",
    error: task.childError || ""
  };
}

export function deriveLiveRunState(currentRunState, payload) {
  const nextRunState = {
    ...(currentRunState && typeof currentRunState === "object" ? currentRunState : {}),
    status: typeof payload?.status === "string" ? payload.status : currentRunState?.status ?? "running",
    steps: Array.isArray(currentRunState?.steps)
      ? currentRunState.steps
      : Array.isArray(payload?.steps)
        ? payload.steps
        : []
  };

  const task = normalizeTaskPayload(payload?.task);
  if (task) {
    nextRunState.task = task;
  }

  return nextRunState;
}

export function deriveOverlayCueForToolStart(toolName, input = {}) {
  if (toolName === "computer") {
    const coord = Array.isArray(input.coordinate) ? input.coordinate : null;
    const action = String(input.action || "").toLowerCase();
    if (coord && coord.length === 2) {
      return {
        cursor: { x: coord[0], y: coord[1] },
        ...((action === "click" || action === "left_click" || action === "double_click")
          ? { click: { x: coord[0], y: coord[1] } }
          : {})
      };
    }
  }

  if (toolName === "navigate") {
    return { cursor: { x: 0.82, y: 0.08 } };
  }

  if (toolName === "read_page" || toolName === "get_page_text") {
    return {
      cursor: { x: 0.5, y: 0.18 },
      highlight: { x: 0.08, y: 0.16, w: 0.84, h: 0.64 }
    };
  }

  if (toolName === "find") {
    return { cursor: { x: 0.5, y: 0.24 } };
  }

  return null;
}

export function deriveOverlayCueForToolDone(_toolName, payload = {}) {
  const cue = {};
  if (payload.cursor && typeof payload.cursor.x === "number" && typeof payload.cursor.y === "number") {
    cue.cursor = { x: payload.cursor.x, y: payload.cursor.y };
  }
  if (payload.click && typeof payload.click.x === "number" && typeof payload.click.y === "number") {
    cue.click = { x: payload.click.x, y: payload.click.y };
  }
  if (
    payload.highlight &&
    typeof payload.highlight.x === "number" &&
    typeof payload.highlight.y === "number" &&
    typeof payload.highlight.w === "number" &&
    typeof payload.highlight.h === "number"
  ) {
    cue.highlight = {
      x: payload.highlight.x,
      y: payload.highlight.y,
      w: payload.highlight.w,
      h: payload.highlight.h
    };
  }
  return Object.keys(cue).length > 0 ? cue : null;
}

export function deriveDraftInsertState(insertContext) {
  const hasSubject = Boolean(insertContext?.subject?.targetId);
  const hasBody = Boolean(insertContext?.body?.targetId);

  if (hasSubject && hasBody) {
    return {
      canInsert: true,
      mode: "subject_and_body",
      statusLabel: "Ready to insert"
    };
  }

  if (hasBody) {
    return {
      canInsert: true,
      mode: "body_only",
      statusLabel: "Body ready"
    };
  }

  if (hasSubject) {
    return {
      canInsert: true,
      mode: "subject_only",
      statusLabel: "Subject ready"
    };
  }

  return {
    canInsert: false,
    mode: "none",
    statusLabel: "Refocus page fields"
  };
}

export function buildEmailDraftCardMarkup(artifact, insertState) {
  return `
    <section class="draft-card" data-draft-kind="email">
      <div class="draft-card-header">
        <span class="draft-card-badge">${SVG.mail}<span>Email</span></span>
        <span class="draft-card-status">${escHtml(insertState.statusLabel)}</span>
      </div>
      <div class="draft-card-subject">
        <span class="draft-card-label">Subject</span>
        <p>${escHtml(artifact.subject)}</p>
      </div>
      <div class="draft-card-body">
        <span class="draft-card-label">Body</span>
        ${renderMarkdown(artifact.body_markdown)}
      </div>
      <div class="draft-card-actions">
        <button class="draft-card-btn draft-card-btn--secondary" type="button" data-draft-action="copy">Copy</button>
        <button class="draft-card-btn draft-card-btn--primary" type="button" data-draft-action="insert" ${insertState.canInsert ? "" : "disabled"}>Insert</button>
      </div>
    </section>`;
}

function setDraftCardState(cardEl, insertState) {
  if (!cardEl) return;
  const status = cardEl.querySelector(".draft-card-status");
  const insertButton = cardEl.querySelector('[data-draft-action="insert"]');
  if (status) status.textContent = insertState.statusLabel;
  if (insertButton) insertButton.disabled = insertState.canInsert !== true;
}

async function fetchInsertContextForActiveTab() {
  const tab = await getActiveWebTab();
  if (!tab?.id) {
    return {
      tabId: null,
      context: undefined
    };
  }

  const response = await chrome.runtime.sendMessage({
    type: "ATLAS_GET_INSERT_CONTEXT",
    tabId: tab.id
  }).catch(() => null);

  return {
    tabId: tab.id,
    context: response?.context
  };
}

async function refreshDraftCardState(cardEl) {
  const { tabId, context } = await fetchInsertContextForActiveTab();
  if (typeof tabId === "number") {
    cardEl.dataset.tabId = String(tabId);
  }
  setDraftCardState(cardEl, deriveDraftInsertState(context));
}

function buildDraftClipboardText(artifact) {
  return `Subject: ${artifact.subject}\n\n${artifact.body_text}`;
}

function attachDraftCardBehaviour(cardEl, artifact) {
  const copyButton = cardEl.querySelector('[data-draft-action="copy"]');
  const insertButton = cardEl.querySelector('[data-draft-action="insert"]');

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(buildDraftClipboardText(artifact));
      showToast("Draft copied", "default", 1400);
    } catch {
      showToast("Copy failed", "error");
    }
  });

  insertButton?.addEventListener("click", async () => {
    const tab = await getActiveWebTab();
    if (!tab?.id) {
      setDraftCardState(cardEl, deriveDraftInsertState(undefined));
      showToast("Focus the page fields first", "error");
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "ATLAS_INSERT_DRAFT",
      tabId: tab.id,
      artifact
    }).catch(() => null);

    setDraftCardState(cardEl, deriveDraftInsertState(response?.context));

    if (response?.ok) {
      const inserted = Array.isArray(response.inserted) ? response.inserted : [];
      const label =
        inserted.length === 2
          ? "Inserted into subject and body"
          : inserted[0] === "subject"
            ? "Inserted into subject"
            : "Inserted into body";
      showToast(label, "default", 1600);
      return;
    }

    showToast(response?.message ?? "Insertion failed", "error");
  });

  void refreshDraftCardState(cardEl);
}

function appendDraftArtifact(msgEl, artifact) {
  if (!msgEl || !artifact || artifact.kind !== "email") return;
  const content = msgEl.querySelector(".msg-content");
  if (!content) return;
  content.querySelector(".draft-card")?.remove();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildEmailDraftCardMarkup(artifact, deriveDraftInsertState(undefined));
  const cardEl = wrapper.firstElementChild;
  if (!cardEl) return;
  content.appendChild(cardEl);
  attachDraftCardBehaviour(cardEl, artifact);
}

// ═══════════════════════════════════════════════════════════════════
// State machine
// ═══════════════════════════════════════════════════════════════════
let state        = "idle";
let currentRunId = null;
let currentAiEl  = null;
let streamBuffer = "";
let currentRunState = null;

// Overlay + attachment state
let overlayKind     = OVERLAY_NONE;
let attachments     = [];
let sessionStore    = null;
let activeSessionId = null;
let recorder        = null;

// Page overlay state
let overlayTabId  = null;
let overlayActive = false;
let currentControlState = "active";
let panelMode = "assistant";
let isReconnecting = false;
let sseReconnectTimer = null;
let currentRunPollTimer = null;
let lastTerminalRunId = null;

function clearRunStatePollTimer() {
  if (!currentRunPollTimer) return;
  clearTimeout(currentRunPollTimer);
  currentRunPollTimer = null;
}

function transitionState(newState) {
  state = newState;
  const btn   = document.getElementById("btn-send");
  const input = document.getElementById("prompt-input");
  if (!btn) return;

  // Micro-animation: pop icon in on swap
  btn.style.transform = "scale(0.82)";
  btn.style.opacity   = "0.6";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    btn.style.transform = "";
    btn.style.opacity   = "";
  }));

  if (newState === "running") {
    btn.innerHTML = SVG.stop;
    btn.classList.add("stop-mode");
    btn.disabled  = false;
    if (input) input.disabled = false;
  } else {
    clearRunStatePollTimer();
    btn.innerHTML = SVG.send;
    btn.classList.remove("stop-mode");
    btn.disabled  = false;
    if (input) { input.disabled = false; input.focus(); }
    currentRunId = null;
    currentAiEl  = null;
    streamBuffer = "";
    currentRunState = null;
  }
  refreshOverlayForLiveState();
}

// ═══════════════════════════════════════════════════════════════════
// Provider / model resolution
// ═══════════════════════════════════════════════════════════════════
async function resolveProvider(taskRequest = {}) {
  const stored = await new Promise(r =>
    chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY, MODEL_BENCHMARK_STORAGE_KEY], r)
  );
  const sessions = await readUnlockedProviders();
  return resolveProviderSelection({
    config: stored[MODEL_CONFIG_STORAGE_KEY],
    catalog: stored[MODEL_CATALOG_STORAGE_KEY] ?? [],
    benchmarkManifest: stored[MODEL_BENCHMARK_STORAGE_KEY],
    sessions,
    taskRequest
  });
}

async function resolveTranscriptionProvider() {
  const settings = await loadPanelSettings();
  const stored = await new Promise(r =>
    chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY], r)
  );
  const config = normalizeModelConfig(stored[MODEL_CONFIG_STORAGE_KEY]);
  const catalog = normalizeModelCatalog(stored[MODEL_CATALOG_STORAGE_KEY] ?? []);
  const sessions = await readUnlockedProviders();
  const resolved = resolveTranscriptionConfig({
    panelSettings: settings,
    modelConfig: config,
    catalog,
    sessions
  });

  if (!resolved.supported) {
    throw new Error(resolved.message);
  }
  if (resolved.missingProviderSession || !resolved.apiKey) {
    throw new Error(buildMissingProviderSessionMessage(resolved.provider));
  }
  if (!resolved.resolvedModelId) {
    throw new Error("No speech-to-text model is configured.");
  }

  return {
    provider: resolved.provider,
    model: resolved.resolvedModelId,
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl,
    language: resolved.language || undefined
  };
}

function setMicButtonState(micBtn, nextState) {
  if (!micBtn) return;
  micBtn.classList.toggle("active", nextState === "recording");
  micBtn.classList.toggle("is-requesting", nextState === "requesting");
  micBtn.classList.toggle("is-transcribing", nextState === "transcribing");
  micBtn.dataset.state = nextState;
  if (nextState === "requesting") {
    micBtn.title = "Waiting for microphone access";
    micBtn.setAttribute("aria-label", "Waiting for microphone access");
  } else if (nextState === "recording") {
    micBtn.title = "Stop recording";
    micBtn.setAttribute("aria-label", "Stop recording");
  } else if (nextState === "transcribing") {
    micBtn.title = "Transcribing";
    micBtn.setAttribute("aria-label", "Transcribing");
  } else {
    micBtn.title = "Voice input";
    micBtn.setAttribute("aria-label", "Voice input");
  }
}

async function transcribeCapturedAudio(audioPayload) {
  if (!audioPayload?.base64 || !audioPayload?.mimeType) {
    throw new Error("Recorded audio was empty.");
  }

  const transcriptionProvider = await resolveTranscriptionProvider();
  const result = await rpc.call("ProviderTranscribeAudio", null, {
    provider: transcriptionProvider.provider,
    model_id: transcriptionProvider.model,
    api_key: transcriptionProvider.apiKey,
    ...(transcriptionProvider.baseUrl ? { base_url: transcriptionProvider.baseUrl } : {}),
    audio_b64: audioPayload.base64,
    mime_type: audioPayload.mimeType,
    ...(transcriptionProvider.language ? { language: transcriptionProvider.language } : {})
  });
  const text = typeof result?.text === "string" ? result.text.trim() : "";
  if (!text) {
    throw new Error("Transcription returned no text.");
  }
  return text;
}

// ═══════════════════════════════════════════════════════════════════
// Message rendering
// ═══════════════════════════════════════════════════════════════════
function setThreadVisible(v) {
  const empty  = document.getElementById("empty-state");
  const thread = document.getElementById("thread");
  if (empty)  empty.hidden  =  v;
  if (thread) thread.hidden = !v;
  syncReconnectCallToAction();
}

function describeAgentStep(step) {
  if (!step) {
    return {
      description: "Planning the next action.",
      chip: "Queued"
    };
  }

  const label = typeof step.label === "string" && step.label.trim().length > 0
    ? step.label.trim()
    : typeof step.toolName === "string" && step.toolName.trim().length > 0
      ? step.toolName.trim()
      : "Working";

  if (step.status === "completed") {
    return {
      description: `${label} completed.`,
      chip: "Done"
    };
  }

  return {
    description: label,
    chip: "Live"
  };
}

function buildThinkingState(message) {
  const article = document.createElement("div");
  article.classList.add("message--assistant-thinking");

  const runState = message?.runState ?? null;
  const steps = Array.isArray(runState?.steps) ? runState.steps : [];
  const latestStep = steps.at(-1) ?? null;
  const completedCount = steps.filter((step) => step?.status === "completed").length;
  const details = describeAgentStep(latestStep);
  const taskMeta = deriveTaskStatusMeta(runState?.task ?? null);

  if (completedCount > 0 && !latestStep) {
    article.classList.add("message--assistant-stale");
  }

  const thinking = document.createElement("div");
  thinking.className = "thinking-block";

  const dots = document.createElement("div");
  dots.className = "thinking-grid";
  for (let index = 0; index < 4; index += 1) {
    const dot = document.createElement("span");
    dot.className = "thinking-grid-dot";
    dots.appendChild(dot);
  }

  const copy = document.createElement("div");
  copy.className = "thinking-copy";

  const headline = document.createElement("div");
  headline.className = "thinking-headline";
  headline.textContent = "Thinking";

  const summary = document.createElement("p");
  summary.className = "thinking-summary";
  summary.textContent = details.description;

  const chips = document.createElement("div");
  chips.className = "thinking-chips";

  const statusChip = document.createElement("span");
  statusChip.className = "thinking-chip";
  statusChip.textContent = details.chip;
  chips.appendChild(statusChip);

  if (completedCount > 0) {
    const completedChip = document.createElement("span");
    completedChip.className = "thinking-chip";
    completedChip.textContent = `${completedCount} step${completedCount === 1 ? "" : "s"}`;
    chips.appendChild(completedChip);
  }

  copy.appendChild(headline);
  copy.appendChild(summary);
  copy.appendChild(chips);

  if (taskMeta) {
    const taskCard = document.createElement("div");
    taskCard.className = "thinking-task-card";

    const taskDescription = document.createElement("p");
    taskDescription.className = "thinking-task-summary";
    taskDescription.textContent = taskMeta.description;
    taskCard.appendChild(taskDescription);

    if (taskMeta.summary) {
      const taskReturned = document.createElement("p");
      taskReturned.className = "thinking-task-note";
      taskReturned.textContent = taskMeta.summary;
      taskCard.appendChild(taskReturned);
    }

    if (taskMeta.error) {
      const taskError = document.createElement("p");
      taskError.className = "thinking-task-note thinking-task-note--error";
      taskError.textContent = taskMeta.error;
      taskCard.appendChild(taskError);
    }

    if (taskMeta.chips.length > 0) {
      const taskChips = document.createElement("div");
      taskChips.className = "thinking-task-chips";
      taskMeta.chips.forEach((label) => {
        const chip = document.createElement("span");
        chip.className = "thinking-task-chip";
        chip.textContent = label;
        taskChips.appendChild(chip);
      });
      taskCard.appendChild(taskChips);
    }

    copy.appendChild(taskCard);
  }

  thinking.appendChild(dots);
  thinking.appendChild(copy);
  article.appendChild(thinking);
  return article;
}

function clearThinkingState(messageEl) {
  messageEl?.querySelector(".message--assistant-thinking")?.remove();
}

function renderThinkingState(messageEl, runState) {
  if (!messageEl) return;
  const content = messageEl.querySelector(".msg-content");
  if (!content) return;
  clearThinkingState(messageEl);
  const thinking = buildThinkingState({ runState });
  content.prepend(thinking);
  syncOverlayTaskStatus(runState);
}

function findLatestActiveThinkingIndex(messages) {
  if (!Array.isArray(messages)) return -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") continue;
    const steps = Array.isArray(message?.runState?.steps) ? message.runState.steps : [];
    if (steps.some((step) => step?.status !== "completed")) {
      return index;
    }
  }
  return -1;
}

function appendUserMsg(text) {
  const thread = document.getElementById("thread");
  const div = document.createElement("div");
  div.className = "thread-msg user";
  div.innerHTML = `<div class="msg-bubble-user">${escHtml(text).replace(/\n/g, "<br>")}</div>`;
  thread.appendChild(div);
  return div;
}

function appendAiMsg() {
  const thread = document.getElementById("thread");
  const div = document.createElement("div");
  div.className = "thread-msg assistant";
  div.innerHTML = `
    <div class="msg-ai-wrap">
      <div class="msg-ai-avatar">${svgGamma("gamma-thinking")}</div>
      <div class="msg-content"><span class="stream-cursor"></span></div>
    </div>`;
  thread.appendChild(div);
  return div;
}

function setAiAvatar(msgEl, animClass) {
  const gc = msgEl?.querySelector(".msg-ai-avatar .gamma-container");
  if (gc) gc.setAttribute("class", `gamma-container${animClass ? " " + animClass : ""}`);
}

function setAiContent(msgEl, html) {
  const c = msgEl?.querySelector(".msg-content");
  if (c) c.innerHTML = html;
}

function hasRenderableMessageText(contentEl) {
  if (!contentEl) return false;
  return Array.from(contentEl.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node;
    if (el.classList.contains("action-log")) return false;
    if (el.dataset.runState) return false;
    return Boolean(el.textContent?.trim());
  });
}

function upsertRunState(contentEl, state, html) {
  if (!contentEl) return;
  let stateEl = contentEl.querySelector("[data-run-state]");
  if (!stateEl) {
    stateEl = document.createElement("div");
    contentEl.appendChild(stateEl);
  }
  stateEl.dataset.runState = state;
  stateEl.innerHTML = html;
}

function clearRunState(contentEl) {
  contentEl?.querySelector("[data-run-state]")?.remove();
}

function broadcastOverlayControlState() {
  if (!overlayActive || !overlayTabId) return;
  chrome.runtime.sendMessage({
    type: "ATLAS_CONTROL_STATE",
    tabId: overlayTabId,
    state: currentControlState,
  }).catch(() => {});
}

function refreshOverlayForLiveState() {
  if (!overlayActive || !overlayTabId) {
    return;
  }
  if (state !== "running") {
    return;
  }
  broadcastOverlayControlState();
  syncOverlayTaskStatus(currentRunState);
}

function syncOverlayTaskStatus(runState = currentRunState) {
  if (!overlayActive || !overlayTabId) {
    return;
  }
  const taskMeta = deriveTaskStatusMeta(runState?.task ?? null);
  if (!taskMeta?.description) {
    return;
  }
  chrome.runtime.sendMessage({
    type: "ATLAS_STATUS_UPDATE",
    tabId: overlayTabId,
    text: taskMeta.description,
    phase: taskMeta.chips.includes("Delegating") ? "planning" : "verifying",
    progress: taskMeta.chips.includes("Returned") ? 82 : 36
  }).catch(() => {});
}

function setOverlayControlState(nextState) {
  currentControlState = nextState;
  broadcastOverlayControlState();
}

function ensureActionLog(msgEl) {
  let log = msgEl.querySelector(".action-log");
  if (!log) {
    log = document.createElement("div");
    log.className = "action-log";
    // Single animated slot — shows only the current action (Comet-style)
    const slot = document.createElement("div");
    slot.className = "action-slot";
    slot.innerHTML = `
      <span class="action-slot-icon"></span>
      <div class="action-slot-text-wrap"><span class="action-slot-text"></span></div>
      <span class="action-slot-spinner"><span></span></span>`;
    const count = document.createElement("div");
    count.className = "action-count";
    count.hidden = true;
    log.appendChild(slot);
    log.appendChild(count);
    const wrap = msgEl.querySelector(".msg-content");
    if (wrap) wrap.prepend(log);
  }
  return log;
}

function appendActionItem(msgEl, toolName, label) {
  const log  = ensureActionLog(msgEl);
  const slot = log.querySelector(".action-slot");
  const iconEl = slot.querySelector(".action-slot-icon");
  const textWrap = slot.querySelector(".action-slot-text-wrap");

  iconEl.innerHTML = TOOL_ICONS[toolName] ?? SVG.cursor;

  const oldText = textWrap.querySelector(".action-slot-text");
  if (oldText && oldText.textContent) {
    // Slot-machine: animate old text out, swap, animate new text in
    oldText.classList.add("_slot-out");
    setTimeout(() => {
      const newText = document.createElement("span");
      newText.className = "action-slot-text";
      newText.textContent = label;
      textWrap.replaceChildren(newText);
    }, 100);
  } else {
    if (oldText) oldText.textContent = label;
  }

  // Reset to active state
  slot.classList.remove("done");
  const check = slot.querySelector(".action-slot-check");
  if (check) {
    // Restore spinner (was replaced by checkmark on previous done)
    const spinner = document.createElement("span");
    spinner.className = "action-slot-spinner";
    spinner.innerHTML = "<span></span>";
    check.replaceWith(spinner);
  }

  return slot;
}

function finishActionItem(itemEl) {
  if (!itemEl) return;
  const slot = itemEl; // itemEl is the slot element
  const log  = slot.closest(".action-log");

  // Increment step count
  const count = log?.querySelector(".action-count");
  if (count) {
    const n = (parseInt(count.dataset.n ?? "0") || 0) + 1;
    count.dataset.n = n;
    count.textContent = n === 1 ? "1 step done" : `${n} steps done`;
    count.hidden = false;
  }

  // Replace spinner with checkmark
  slot.classList.add("done");
  const spinner = slot.querySelector(".action-slot-spinner");
  if (spinner) {
    const check = document.createElement("span");
    check.className = "action-slot-check action-slot-icon";
    check.innerHTML = SVG.check;
    check.style.color = "oklch(72.3% .191 149.58)";
    spinner.replaceWith(check);
  }
}

function appendSources(msgEl, sources) {
  if (!sources?.length) return;
  const content = msgEl.querySelector(".msg-content");
  if (!content) return;
  // Strip internal system sources (user:prompt, system:policy) that carry no real URL
  const webSources = sources.filter(s => {
    const u = s.url ?? s.link ?? "";
    if (!u || u === "#") return false;
    try { new URL(u); return true; } catch { return false; }
  });
  if (!webSources.length) return;
  const row = document.createElement("div");
  row.className = "sources-row";
  for (const src of webSources.slice(0, 6)) {
    const url   = src.url ?? src.link ?? "#";
    const title = src.title ?? src.name ?? url;
    let domain = "";
    try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
    const a = document.createElement("a");
    a.className = "source-chip";
    a.href      = url;
    a.target    = "_blank";
    a.rel       = "noopener noreferrer";
    a.title     = title;
    a.innerHTML = `<img class="source-chip-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16" alt="" onerror="this.style.display='none'"><span>${escHtml(domain || title)}</span>`;
    row.appendChild(a);
  }
  content.appendChild(row);
}

// ═══════════════════════════════════════════════════════════════════
// Toast notifications
// ═══════════════════════════════════════════════════════════════════
function showToast(msg, type = "default", durationMs = 3200) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast${type === "error" ? " error" : ""}`;
  t.textContent = type === "error" ? normalizePanelErrorMessage(msg) : String(msg ?? "");
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add("hiding");
    t.addEventListener("animationend", () => t.remove(), { once: true });
  }, durationMs);
}

function buildProviderSetupCard(provider) {
  const providerLabel = provider === "openai"
    ? "OpenAI"
    : provider === "deepseek"
      ? "DeepSeek"
      : provider.charAt(0).toUpperCase() + provider.slice(1);
  return `
    <div class="inline-state-card">
      <div class="inline-state-icon">${SVG.gear}</div>
      <div class="inline-state-copy">
        <div class="inline-state-title">${escHtml(`${providerLabel} needs setup`)}</div>
        <div class="inline-state-body">${escHtml(buildMissingProviderSessionMessage(provider))}</div>
      </div>
      <button class="inline-state-action" type="button" data-open-settings-section="general">Open General</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// Scroll helpers
// ═══════════════════════════════════════════════════════════════════
function scrollToBottom(smooth = true) {
  const stage = document.getElementById("stage");
  if (!stage) return;
  if (smooth && stage.scrollHeight - stage.scrollTop - stage.clientHeight > 40) {
    stage.scrollTo({ top: stage.scrollHeight, behavior: "smooth" });
  } else {
    stage.scrollTop = stage.scrollHeight;
  }
}

function setupScrollFab() {
  const stage = document.getElementById("stage");
  const fab   = document.getElementById("scroll-fab");
  if (!stage || !fab) return;

  let fabVisible = false;

  const hideFab = () => {
    if (!fabVisible) return;
    fabVisible = false;
    fab.style.animation = "scaleAndFadeOut .12s var(--ease-in-expo) both";
    fab.addEventListener("animationend", () => {
      fab.hidden = true;
      fab.style.animation = "";
    }, { once: true });
  };

  const showFab = () => {
    if (fabVisible) return;
    fabVisible = true;
    fab.hidden = false;
    fab.style.animation = "";
  };

  const update = () => {
    const atBottom = (stage.scrollHeight - stage.scrollTop - stage.clientHeight) < 80;
    if (atBottom) hideFab(); else showFab();
  };

  stage.addEventListener("scroll", update, { passive: true });
  fab.addEventListener("click", () => { scrollToBottom(); hideFab(); });
}

// ═══════════════════════════════════════════════════════════════════
// Overlay state machine
// ═══════════════════════════════════════════════════════════════════
let _overlayCancelClose = null; // cancel any pending close animation

function setOverlay(kind) {
  const prev = overlayKind;
  overlayKind = normalizeOverlayKind(kind);

  // Cancel any in-flight close animation so it can't close a freshly-opened overlay
  if (_overlayCancelClose) { _overlayCancelClose(); _overlayCancelClose = null; }

  // If closing, play exit animation before hiding
  if (prev !== OVERLAY_NONE && overlayKind === OVERLAY_NONE) {
    const panel = document.getElementById("overlay-panel");
    if (panel && !panel.hidden) {
      panel.dataset.state = "closed";
      let cancelled = false;
      const cleanup = () => {
        if (cancelled) return;
        panel.hidden = true;
        panel.innerHTML = "";
        delete panel.dataset.state;
        delete panel.dataset.kind;
        _overlayCancelClose = null;
      };
      const t = setTimeout(cleanup, 180);
      const onAnim = () => { clearTimeout(t); cleanup(); };
      panel.addEventListener("animationend", onAnim, { once: true });
      _overlayCancelClose = () => {
        cancelled = true;
        clearTimeout(t);
        panel.removeEventListener("animationend", onAnim);
        _overlayCancelClose = null;
      };
      return;
    }
  }

  renderOverlay();
}

function renderOverlay() {
  const panel = document.getElementById("overlay-panel");
  if (!panel) return;

  if (overlayKind === OVERLAY_NONE) {
    panel.hidden = true;
    panel.innerHTML = "";
    panel.removeAttribute("data-kind");
    return;
  }

  panel.hidden = false;
  panel.dataset.kind = overlayKind;
  panel.dataset.state = "open";
  // Re-animate
  panel.style.animation = "none";
  panel.offsetHeight; // reflow
  panel.style.animation = "";

  if (overlayKind === "slash")   { renderSlashPalette(panel, _slashToken);   return; }
  if (overlayKind === "at")      { renderAtPalette(panel, _atToken);         return; }
  if (overlayKind === "plus")    { renderPlusMenu(panel);                    return; }
  if (overlayKind === "model")   { renderModelPicker(panel);                 return; }
  if (overlayKind === "recents") { renderRecentsPalette(panel);              return; }
}

function closeAllOverlays() {
  setOverlay(OVERLAY_NONE);
  closeKebab();
}

// Palette keyboard navigation helper
function setupPaletteNav(panel) {
  const items = () => [...panel.querySelectorAll(".palette-item:not([disabled])")];
  panel.addEventListener("keydown", (e) => {
    const list = items();
    const cur  = document.activeElement;
    const idx  = list.indexOf(cur);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[Math.min(idx + 1, list.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx <= 0) { document.getElementById("prompt-input")?.focus(); }
      else          { list[idx - 1].focus(); }
    } else if (e.key === "Escape") {
      closeAllOverlays();
      document.getElementById("prompt-input")?.focus();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// Slash palette
// ═══════════════════════════════════════════════════════════════════
let _slashToken = "";
let _atToken = "";

async function renderSlashPalette(panel, token = "") {
  let shortcuts = BUILTIN_SHORTCUTS;
  try {
    const stored = await new Promise(r => chrome.storage.local.get([SHORTCUTS_STORAGE_KEY], r));
    const custom = stored[SHORTCUTS_STORAGE_KEY];
    if (Array.isArray(custom) && custom.length) {
      shortcuts = [...custom, ...BUILTIN_SHORTCUTS.filter(b => !custom.some(c => c.id === b.id))];
    }
  } catch {}

  const matches = listMatchingShortcuts(shortcuts, token);
  if (!matches.length) { panel.hidden = true; return; }

  panel.innerHTML = `
    <div class="palette-header">Commands</div>
    ${matches.slice(0, 8).map(s => `
      <button class="palette-item" data-shortcut-id="${escHtml(s.id)}">
        <span class="pi-icon">${SVG.slash}</span>
        <span class="pi-label">${escHtml(s.label)}</span>
        <span class="pi-desc">${escHtml((s.instructions ?? "").slice(0, 40))}</span>
      </button>`).join("")}
    <div class="palette-divider"></div>
    <button class="palette-item" data-shortcut-settings="true">
      <span class="pi-icon">${SVG.gear}</span>
      <span class="pi-label">Edit commands</span>
    </button>`;

  setupPaletteNav(panel);
  panel.querySelectorAll(".palette-item").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.shortcutSettings === "true") {
        void openCommandsSettingsPage();
        return;
      }
      const s = matches.find(m => m.id === btn.dataset.shortcutId);
      if (!s) return;
      const input = document.getElementById("prompt-input");
      if (input) { input.value = s.instructions ?? ""; autoResize(input); input.focus(); }
      setOverlay(OVERLAY_NONE);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// @ context palette
// ═══════════════════════════════════════════════════════════════════
async function renderAtPalette(panel, token = "") {
  let tab = null;
  let tabs = [];
  try {
    tab = await getActiveWebTab();
    tabs = await chrome.tabs.query({ currentWindow: true, url: ["http://*/*", "https://*/*"] });
  } catch {}

  const query = token.trim().toLowerCase();
  const tabItems = tabs
    .filter((entry) => entry.id !== tab?.id)
    .filter((entry) => {
      if (!query) {
        return true;
      }
      const title = typeof entry.title === "string" ? entry.title.toLowerCase() : "";
      const url = typeof entry.url === "string" ? entry.url.toLowerCase() : "";
      return title.includes(query) || url.includes(query);
    })
    .slice(0, 6)
    .map((entry) => ({
      id: `tab-${entry.id}`,
      label: entry.title ?? "Tab",
      desc: entry.url ?? "",
      icon: SVG.globe,
      mentionLabel: entry.title ?? "Tab"
    }));

  const items = [
    {
      id: "page",
      label: "Current page",
      desc: hasAccessibleWebTab(tab) ? (tab?.title ?? "Active tab") : "Open a website tab first",
      icon: SVG.globe,
      mentionLabel: "Current page",
      disabled: !hasAccessibleWebTab(tab)
    },
    { id: "shot", label: "Screenshot",    desc: "Capture current page",           icon: SVG.camera, action: "screenshot" },
    {
      id: "tabs",
      label: "All open tabs",
      desc: tabItems.length > 0 ? "Reference all open tabs" : "No website tabs available",
      icon: SVG.newChat,
      mentionLabel: "All open tabs",
      disabled: tabItems.length === 0
    },
    ...tabItems
  ];

  panel.innerHTML = `
    <div class="palette-header">Context</div>
    ${items.map(item => `
      <button class="palette-item" data-at-id="${escHtml(item.id)}"${item.disabled ? " disabled" : ""}>
        <span class="pi-icon">${item.icon}</span>
        <span class="pi-label">${escHtml(item.label)}</span>
        <span class="pi-desc">${escHtml(item.desc)}</span>
      </button>`).join("")}`;

  setupPaletteNav(panel);
  panel.querySelectorAll(".palette-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = items.find(i => i.id === btn.dataset.atId);
      if (!item || item.disabled) return;
      const input = document.getElementById("prompt-input");
      if (!input) return;
      const val    = input.value;
      const atPos  = val.lastIndexOf("@");
      const before = atPos >= 0 ? val.slice(0, atPos) : val;

      if (item.action === "screenshot") {
        try {
          const resp = await chrome.runtime.sendMessage({ action: "captureScreenshot" });
          if (resp?.error) throw new Error(resp.error);
          if (resp?.dataUrl) {
            attachments.push({ type: "screenshot", dataUrl: resp.dataUrl, name: "screenshot.png" });
            updateAttachmentPreview();
            input.value = before;
            showToast("Screenshot captured", "default", 1600);
          } else {
            throw new Error("No image returned");
          }
        } catch (e) { showToast("Screenshot failed: " + (e?.message ?? "unknown"), "error"); }
      } else if (item.mentionLabel) {
        insertAtMentionToken(input, item.mentionLabel);
      }
      autoResize(input);
      input.focus();
      setOverlay(OVERLAY_NONE);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// + menu
// ═══════════════════════════════════════════════════════════════════
function renderPlusMenu(panel) {
  panel.innerHTML = `
    <button class="palette-item" id="plus-attach-file">
      <span class="pi-icon">${SVG.paperclip}</span>
      <span class="pi-label">Upload files or images</span>
    </button>
    <button class="palette-item" id="plus-screenshot">
      <span class="pi-icon">${SVG.camera}</span>
      <span class="pi-label">Screenshot</span>
    </button>
    <button class="palette-item" id="plus-control">
      <span class="pi-icon">${SVG.cursor}</span>
      <span class="pi-label">Control browser</span>
    </button>`;

  setupPaletteNav(panel);

  document.getElementById("plus-attach-file")?.addEventListener("click", () => {
    setOverlay(OVERLAY_NONE);
    const fi = document.createElement("input");
    fi.type     = "file";
    fi.multiple = true;
    fi.accept   = ".txt,.md,.json,.csv,.html,.xml,.yml,.yaml,.js,.ts,.jsx,.tsx,.css,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sh";
    fi.addEventListener("change", async () => {
      if (!fi.files?.length) return;
      try {
        const added = await readImportedAttachments(fi.files);
        attachments.push(...added);
        updateAttachmentPreview();
      } catch { showToast("Failed to read file", "error"); }
    });
    fi.click();
  });

  document.getElementById("plus-screenshot")?.addEventListener("click", async () => {
    setOverlay(OVERLAY_NONE);
    try {
      const resp = await chrome.runtime.sendMessage({ action: "captureScreenshot" });
      if (resp?.error) throw new Error(resp.error);
      if (resp?.dataUrl) {
        attachments.push({ type: "screenshot", dataUrl: resp.dataUrl, name: "screenshot.png" });
        updateAttachmentPreview();
        showToast("Screenshot captured", "default", 1600);
      } else {
        throw new Error("No image returned");
      }
    } catch (e) { showToast("Screenshot failed: " + (e?.message ?? "unknown"), "error"); }
  });

  document.getElementById("plus-control")?.addEventListener("click", async () => {
    setOverlay(OVERLAY_NONE);
    try {
      const tab = await getActiveWebTab();
      if (tab?.id) {
        chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_START", tabId: tab.id }).catch(() => {});
        overlayTabId  = tab.id;
        overlayActive = true;
        currentControlState = "active";
        showToast("Browser control active", "default", 1600);
      }
    } catch {}
    const input = document.getElementById("prompt-input");
    if (input) input.focus();
  });
}

// ═══════════════════════════════════════════════════════════════════
// Model picker
// ═══════════════════════════════════════════════════════════════════
async function renderModelPicker(panel) {
  const stored  = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY], r));
  const config  = normalizeModelConfig(stored[MODEL_CONFIG_STORAGE_KEY]);
  const catalog = normalizeModelCatalog(stored[MODEL_CATALOG_STORAGE_KEY] ?? []);
  const isAuto  = config.defaultModelMode === "auto";
  const selId   = config.selectedModelId ?? "";

  // Group catalog by provider
  const grouped = {};
  for (const m of catalog) {
    if (!grouped[m.provider]) grouped[m.provider] = [];
    grouped[m.provider].push(m);
  }

  let html = `
    <button class="palette-item${isAuto ? " palette-item--active" : ""}" data-model-mode="auto">
      <span class="pi-icon">${SVG.flash}</span>
      <span class="pi-label">Auto</span>
      <span class="pi-desc">Best model for each task</span>
      ${isAuto ? `<span class="pi-check">${SVG.check}</span>` : ""}
    </button>`;

  if (Object.keys(grouped).length > 0) {
    html += `<div class="palette-divider"></div>`;
    for (const [provider, models] of Object.entries(grouped)) {
      html += `<div class="palette-header">${escHtml(provider)}</div>`;
      for (const m of models) {
        const isSelected = !isAuto && m.id === selId;
        html += `
          <button class="palette-item${isSelected ? " palette-item--active" : ""}" data-model-id="${escHtml(m.id)}" data-provider="${escHtml(provider)}">
            <span class="pi-label">${escHtml(m.displayName ?? m.id)}</span>
            <span class="pi-desc">${escHtml(m.costTier ?? "")}</span>
            ${isSelected ? `<span class="pi-check">${SVG.check}</span>` : ""}
          </button>`;
      }
    }
  } else {
    html += `<div class="palette-divider"></div><div class="palette-empty">No models — add one in Settings</div>`;
  }

  panel.innerHTML = html;
  setupPaletteNav(panel);

  panel.querySelector('[data-model-mode="auto"]')?.addEventListener("click", async () => {
    const s = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY], r));
    const c = normalizeModelConfig(s[MODEL_CONFIG_STORAGE_KEY]);
    c.defaultModelMode = "auto";
    chrome.storage.local.set({ [MODEL_CONFIG_STORAGE_KEY]: c });
    updateModelLabel("Auto");
    setOverlay(OVERLAY_NONE);
  });

  panel.querySelectorAll("[data-model-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const modelId = btn.dataset.modelId;
      const providerId = btn.dataset.provider;
      const s = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY], r));
      const c = normalizeModelConfig(s[MODEL_CONFIG_STORAGE_KEY]);
      c.defaultModelMode = "manual";
      c.selectedModelId  = modelId;
      if (providerId) {
        c.selectedProvider = providerId;
      }
      chrome.storage.local.set({ [MODEL_CONFIG_STORAGE_KEY]: c });
      const shortName = modelId.includes("/") ? modelId.split("/").pop() : modelId;
      updateModelLabel(shortName.slice(0, 18));
      setOverlay(OVERLAY_NONE);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Recents palette
// ═══════════════════════════════════════════════════════════════════
async function renderRecentsPalette(panel) {
  const stored   = await new Promise(r => chrome.storage.local.get([CHAT_SESSIONS_STORAGE_KEY], r));
  const store    = normalizeChatSessionsStore(stored[CHAT_SESSIONS_STORAGE_KEY]);
  const sessions = getSortedSessions(store);

  const relTime = (ts) => {
    if (!ts) return "";
    const d = Date.now() - (typeof ts === "number" ? ts : Date.parse(ts));
    if (d < 60000)    return "just now";
    if (d < 3600000)  return `${Math.round(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.round(d / 3600000)}h ago`;
    return `${Math.round(d / 86400000)}d ago`;
  };

  if (!sessions.length) {
    panel.innerHTML = `<div class="palette-empty">No recent chats</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="palette-header">Recent chats</div>
    ${sessions.slice(0, 10).map(s => `
      <button class="palette-item" data-session-id="${escHtml(s.id)}">
        <span class="pi-icon">${SVG.clock}</span>
        <span class="pi-label" style="font-size:12.5px">${escHtml(s.title ?? "Chat")}</span>
        <span class="pi-desc">${relTime(s.updatedAt ?? s.createdAt)}</span>
      </button>`).join("")}
    <div class="palette-divider"></div>
    <button class="palette-item" data-recents-manage="true">
      <span class="pi-icon">${SVG.gear}</span>
      <span class="pi-label">Manage chats</span>
    </button>`;

  setupPaletteNav(panel);
  panel.querySelectorAll("[data-session-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const session = sessions.find(s => s.id === btn.dataset.sessionId);
      if (session) restoreSession(session);
      setOverlay(OVERLAY_NONE);
    });
  });
  panel.querySelector('[data-recents-manage="true"]')?.addEventListener("click", () => {
    void openSettingsPage("data-controls");
  });
}

function restoreSession(session) {
  if (state === "running") stopRun();
  const thread = document.getElementById("thread");
  if (thread) { thread.innerHTML = ""; }
  document.getElementById("empty-state").hidden = true;
  document.getElementById("thread").hidden       = false;

  const msgs = session.messages ?? [];
  for (const msg of msgs) {
    if (msg.role === "user") {
      const el = appendUserMsg(msg.text ?? "");
      // Suppress entry animation on history restore
      if (el) el.style.animation = "none";
    } else if (msg.role === "assistant") {
      const el = appendAiMsg();
      if (el) el.style.animation = "none";
      const content = el?.querySelector(".msg-content");
      if (content) content.innerHTML = msg.text ? renderMarkdown(msg.text) : "<em style='opacity:.5'>No response.</em>";
    }
  }
  scrollToBottom(false);
  activeSessionId = session.id;
  sessionStore = {
    ...normalizeChatSessionsStore(sessionStore),
    activeSessionId
  };
  chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════
// Kebab menu
// ═══════════════════════════════════════════════════════════════════
let _kebabOpen = false;

function renderKebabRootMenu(menu) {
  menu.innerHTML = `
    <button class="palette-item" id="kebab-new-chat">
      <span class="pi-icon">${SVG.newChat}</span>
      <span class="pi-label">New chat</span>
    </button>
    <button class="palette-item" id="kebab-recents">
      <span class="pi-icon">${SVG.clock}</span>
      <span class="pi-label">Recent chats</span>
    </button>
    <div class="palette-divider"></div>
    <button class="palette-item" id="kebab-settings">
      <span class="pi-icon">${SVG.gear}</span>
      <span class="pi-label">Settings</span>
    </button>`;

  setupPaletteNav(menu);
  document.getElementById("kebab-new-chat")?.addEventListener("click", () => {
    closeKebab(); newChat();
  });
  document.getElementById("kebab-recents")?.addEventListener("click", () => {
    void renderRecentsPalette(menu);
  });
  document.getElementById("kebab-settings")?.addEventListener("click", () => {
    closeKebab();
    void openSettingsPage();
  });
}

function openKebab() {
  const menu = document.getElementById("kebab-menu");
  if (!menu) return;
  _kebabOpen = true;
  menu.hidden = false;
  renderKebabRootMenu(menu);
}

function closeKebab() {
  _kebabOpen = false;
  const menu = document.getElementById("kebab-menu");
  if (menu) {
    menu.hidden = true;
    menu.innerHTML = "";
  }
}

function toggleKebab() {
  _kebabOpen ? closeKebab() : openKebab();
}

// ═══════════════════════════════════════════════════════════════════
// Attachment preview
// ═══════════════════════════════════════════════════════════════════
function updateAttachmentPreview() {
  const preview = document.getElementById("attachment-preview");
  if (!preview) return;
  if (!attachments.length) {
    preview.hidden = true;
    preview.innerHTML = "";
    return;
  }
  preview.hidden = false;
  preview.innerHTML = "";
  attachments.forEach((a, i) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const isImage = (a.type === "screenshot" || a.type === "image") && a.dataUrl;
    if (isImage) {
      const thumb = document.createElement("img");
      thumb.className = "attach-thumb";
      thumb.src = a.dataUrl;
      thumb.alt = a.name ?? "image";
      chip.appendChild(thumb);
    } else {
      const icon = document.createElement("span");
      icon.className = "attach-icon";
      icon.innerHTML = SVG.paperclip;
      chip.appendChild(icon);
    }
    const nameEl = document.createElement("span");
    nameEl.className = "attach-name";
    nameEl.textContent = a.name ?? "file";
    chip.appendChild(nameEl);
    const removeBtn = document.createElement("button");
    removeBtn.className = "attachment-remove";
    removeBtn.dataset.idx = String(i);
    removeBtn.setAttribute("aria-label", "Remove");
    removeBtn.innerHTML = SVG.xMark;
    removeBtn.addEventListener("click", () => {
      attachments.splice(i, 1);
      updateAttachmentPreview();
    });
    chip.appendChild(removeBtn);
    preview.appendChild(chip);
  });
}

// ═══════════════════════════════════════════════════════════════════
// Model label helper
// ═══════════════════════════════════════════════════════════════════
function updateModelLabel(text) {
  const el = document.getElementById("model-label");
  if (el) el.textContent = text;
}

async function syncModelLabelFromStorage() {
  try {
    const stored = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY], r));
    const config = normalizeModelConfig(stored[MODEL_CONFIG_STORAGE_KEY]);
    const catalog = normalizeModelCatalog(stored[MODEL_CATALOG_STORAGE_KEY] ?? []);
    if (config.defaultModelMode === "auto" || config.selectedModelId === "auto") {
      updateModelLabel("Auto");
    } else if (config.selectedModelId) {
      const selected = catalog.find((entry) => entry.provider === config.selectedProvider && entry.id === config.selectedModelId);
      const label = selected?.displayName ?? config.selectedModelId;
      const shortName = label.includes("/") ? label.split("/").pop() : label;
      updateModelLabel(shortName.slice(0, 18));
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// SSE connection
// ═══════════════════════════════════════════════════════════════════
let sseSource   = null;
let actionItems = new Map();

function normaliseSettingsSection(value) {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  const aliases = {
    provider: "general",
    models: "general",
    data: "data-controls",
    commands: "agent-mode",
    agent: "agent-mode"
  };
  return aliases[id] || id || "general";
}

function buildSettingsFrameUrl(section = "general") {
  const targetSection = normaliseSettingsSection(section);
  const path = `options.html?embedded=panel&section=${targetSection}`;
  if (typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function") {
    return chrome.runtime.getURL(path);
  }
  return path;
}

function setPanelMode(mode, section = "general") {
  panelMode = mode === "settings" ? "settings" : "assistant";
  const header = document.querySelector(".panel-header");
  const shell = document.querySelector(".assistant-shell");
  const mainView = document.getElementById("assistant-main-view");
  const settingsView = document.getElementById("settings-view");
  const settingsFrame = document.getElementById("settings-frame");
  const backButton = document.getElementById("btn-settings-back");
  const headerActions = document.getElementById("panel-header-actions-main");
  const headerTitle = document.getElementById("panel-header-title");
  const brandIcon = document.getElementById("panel-brand-icon");

  const isSettings = panelMode === "settings";
  if (header) header.hidden = false;
  shell?.classList.toggle("is-settings-mode", isSettings);
  if (mainView) mainView.hidden = isSettings;
  if (settingsView) settingsView.hidden = !isSettings;
  if (backButton) backButton.hidden = !isSettings;
  if (headerActions) headerActions.hidden = isSettings;
  if (headerTitle) headerTitle.textContent = isSettings ? "Settings" : "Assistant";
  if (brandIcon) brandIcon.hidden = isSettings;

  if (isSettings && settingsFrame) {
    const nextUrl = buildSettingsFrameUrl(section);
    if (settingsFrame.getAttribute("src") !== nextUrl) {
      settingsFrame.setAttribute("src", nextUrl);
    }
  }
}

async function openSettingsPage(section = "general") {
  closeKebab();
  setOverlay(OVERLAY_NONE);
  setPanelMode("settings", section);
}

function closeSettingsPage() {
  setPanelMode("assistant");
  const input = document.getElementById("prompt-input");
  input?.focus();
}

async function openCommandsSettingsPage() {
  await openSettingsPage("agent-mode");
}

function clearSseReconnectTimer() {
  if (sseReconnectTimer !== null) {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = null;
  }
}

function scheduleSseReconnect() {
  if (sseReconnectTimer !== null) return;
  sseReconnectTimer = setTimeout(() => {
    sseReconnectTimer = null;
    connectSSE();
  }, 3000);
}

function syncReconnectCallToAction() {
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = emptyState?.querySelector(".empty-title");
  const emptyReconnectButton = document.getElementById("empty-reconnect-btn");
  if (!emptyReconnectButton || !emptyTitle) return;

  const shouldShow = !emptyState?.hidden && !_connOk;
  emptyReconnectButton.hidden = !shouldShow;
  emptyReconnectButton.disabled = isReconnecting;
  emptyReconnectButton.textContent = isReconnecting ? RECONNECT_BUSY_LABEL : "Reconnect to sidecar";
  emptyTitle.textContent = shouldShow ? OFFLINE_EMPTY_COPY : EMPTY_DEFAULT_COPY;
}

function reconnectToSidecar() {
  if (isReconnecting) return;
  isReconnecting = true;
  syncReconnectCallToAction();
  clearSseReconnectTimer();

  try {
    sseSource?.close();
  } catch {}
  sseSource = null;

  rpc.reconnect();
  connectSSE();

  setTimeout(() => {
    isReconnecting = false;
    syncReconnectCallToAction();
  }, 1200);
}

function connectSSE() {
  if (sseSource) return;
  sseSource = new EventSource(EVENTS_URL);

  sseSource.addEventListener("open",  () => {
    clearSseReconnectTimer();
    isReconnecting = false;
    setConnStatus(true);
  });
  sseSource.addEventListener("error", () => {
    setConnStatus(false);
    try {
      sseSource.close();
    } catch {}
    sseSource = null;
    scheduleSseReconnect();
  });
  sseSource.addEventListener("heartbeat", () => setConnStatus(true));

  // status: agent_run_updated
  sseSource.addEventListener("status", (e) => {
    try {
      const env  = JSON.parse(e.data);
      const p    = env?.payload ?? env;
      if (p?.run_id && currentRunId && p.run_id !== currentRunId) return;
      const s    = p?.status;

      if (s === "running" && currentAiEl) {
        setOverlayControlState("active");
        clearRunState(currentAiEl.querySelector(".msg-content"));
        setAiAvatar(currentAiEl, "gamma-thinking");
        renderThinkingState(currentAiEl, currentRunState);
      }

      if (s === "pausing" && currentAiEl) {
        setOverlayControlState("pausing");
        const content = currentAiEl.querySelector(".msg-content");
        upsertRunState(content, "pausing", "<em style='opacity:.5'>Pausing…</em>");
      }

      if (s === "paused" && currentAiEl) {
        setOverlayControlState("paused");
        const content = currentAiEl.querySelector(".msg-content");
        upsertRunState(content, "paused", "<em style='opacity:.5'>Paused — you have control.</em>");
      }

      if (s === "tool_start" && currentAiEl) {
        const toolName = p?.tool_name ?? "tool";
        const label = p?.tool_label ?? formatToolLabel(toolName, p?.tool_input);

        if (!currentRunState) {
          currentRunState = { steps: [] };
        }
        currentRunState.steps.push({
          callId: p?.tool_call_id ?? null,
          toolName,
          label,
          status: "running"
        });
        clearRunState(currentAiEl.querySelector(".msg-content"));
        renderThinkingState(currentAiEl, currentRunState);

        const overlayCue = deriveOverlayCueForToolStart(toolName, p?.tool_input);
        if (overlayCue && overlayTabId) {
          if (!overlayActive) {
            chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_START", tabId: overlayTabId }).catch(() => {});
            overlayActive = true;
          }
          if (overlayCue.cursor) {
            chrome.runtime.sendMessage({
              type: "ATLAS_CURSOR",
              tabId: overlayTabId,
              x: overlayCue.cursor.x,
              y: overlayCue.cursor.y
            }).catch(() => {});
          }
          if (overlayCue.click) {
            chrome.runtime.sendMessage({
              type: "ATLAS_CLICK",
              tabId: overlayTabId,
              x: overlayCue.click.x,
              y: overlayCue.click.y
            }).catch(() => {});
          }
          if (overlayCue.highlight) {
            chrome.runtime.sendMessage({
              type: "ATLAS_HIGHLIGHT",
              tabId: overlayTabId,
              rect: overlayCue.highlight
            }).catch(() => {});
          }
        }
        // Forward status text to overlay
        if (overlayActive && overlayTabId) {
          const statusText = formatToolLabel(toolName, p?.tool_input);
          chrome.runtime.sendMessage({
            type: "ATLAS_STATUS_UPDATE",
            tabId: overlayTabId,
            text: statusText,
            phase: phaseForTool(toolName),
            progress: progressForTool(toolName),
          }).catch(() => {});
        }

        const item  = appendActionItem(currentAiEl, toolName, label);
        if (p?.tool_call_id) actionItems.set(p.tool_call_id, item);
        setAiAvatar(currentAiEl, "gamma-scanning");
        scrollToBottom();
      }

      if (s === "tool_done" && p?.tool_call_id) {
        if (currentRunState) {
          const matchingStep = [...currentRunState.steps]
            .reverse()
            .find((step) => step?.callId === p.tool_call_id) ?? currentRunState.steps.at(-1) ?? null;
          if (matchingStep) {
            matchingStep.status = "completed";
          }
          renderThinkingState(currentAiEl, currentRunState);
        }
        const item = actionItems.get(p.tool_call_id);
        finishActionItem(item);
        actionItems.delete(p.tool_call_id);
        const overlayCue = deriveOverlayCueForToolDone(p?.tool_name ?? "tool", p?.overlay ?? {});
        if (overlayCue && overlayActive && overlayTabId) {
          if (overlayCue.cursor) {
            chrome.runtime.sendMessage({
              type: "ATLAS_CURSOR",
              tabId: overlayTabId,
              x: overlayCue.cursor.x,
              y: overlayCue.cursor.y
            }).catch(() => {});
          }
          if (overlayCue.click) {
            chrome.runtime.sendMessage({
              type: "ATLAS_CLICK",
              tabId: overlayTabId,
              x: overlayCue.click.x,
              y: overlayCue.click.y
            }).catch(() => {});
          }
          if (overlayCue.highlight) {
            chrome.runtime.sendMessage({
              type: "ATLAS_HIGHLIGHT",
              tabId: overlayTabId,
              rect: overlayCue.highlight
            }).catch(() => {});
          }
        }
        if (p?.screenshot_b64 && currentAiEl) {
          const content = currentAiEl.querySelector(".msg-content");
          if (content) {
            const imgWrap = document.createElement("div");
            imgWrap.className = "agent-screenshot";
            const header = document.createElement("div");
            header.className = "agent-screenshot-header";
            header.innerHTML = `${SVG.camera}<span>Agent view</span>`;
            const img = document.createElement("img");
            img.src = "data:image/png;base64," + p.screenshot_b64;
            img.alt = "Agent screenshot";
            imgWrap.appendChild(header);
            imgWrap.appendChild(img);
            content.appendChild(imgWrap);
            scrollToBottom();
          }
        }
      }
    } catch {}
  });

  // log: streaming token delta
  sseSource.addEventListener("log", (e) => {
    try {
      const env   = JSON.parse(e.data);
      const p     = env?.payload ?? env;
      if (p?.run_id && currentRunId && p.run_id !== currentRunId) return;
      const delta = p?.token ?? p?.delta ?? "";
      if (!delta || !currentAiEl) return;

      streamBuffer += delta;
      setAiAvatar(currentAiEl, "gamma-streaming");
      clearThinkingState(currentAiEl);
      const content = currentAiEl.querySelector(".msg-content");
      if (content) {
        const log = content.querySelector(".action-log");
        content.innerHTML = "";
        if (log) content.appendChild(log);
        const textNode = document.createElement("div");
        textNode.className = "stream-text";
        textNode.innerHTML = renderMarkdown(streamBuffer) + `<span class="stream-cursor"></span>`;
        content.appendChild(textNode);
      }
      scrollToBottom();
    } catch {}
  });

  // result: final answer
  sseSource.addEventListener("result", (e) => {
    let shouldTransition = false;
    try {
      const env     = JSON.parse(e.data);
      const p       = env?.payload ?? env;
      if (p?.run_id && lastTerminalRunId === p.run_id) return;
      // Match by run_id OR accept if currentRunId is null (reconnect edge-case)
      if (p?.run_id && currentRunId && p.run_id !== currentRunId) return;

      shouldTransition = true; // we own this run — always transition when done
      if (finalizeCurrentRun(p?.run_id ?? currentRunId, p)) {
        shouldTransition = false;
      }
    } catch {
      // exception during result processing — still need to reset state
    } finally {
      // Always reset the stop button if we owned this result
      if (shouldTransition) transitionState("idle");
    }
  });
}

function phaseForTool(toolName) {
  if (toolName === "navigate") return "navigating";
  if (toolName === "read_page") return "reading";
  if (toolName === "get_page_text") return "extracting";
  if (toolName === "computer") return "typing";
  if (toolName === "find" || toolName === "form_input") return "verifying";
  if (toolName === "search_web") return "planning";
  return overlayPhaseForTool(toolName);
}

function progressForTool(toolName) {
  if (toolName === "search_web") return 28;
  if (toolName === "navigate") return 42;
  if (toolName === "read_page" || toolName === "get_page_text") return 66;
  if (toolName === "find") return 74;
  if (toolName === "computer") return 86;
  return 52;
}

// ═══════════════════════════════════════════════════════════════════
// Tool label formatting
// ═══════════════════════════════════════════════════════════════════
function formatToolLabel(toolName, input) {
  if (!input) return toolName;
  if (toolName === "navigate")      return `Navigate → ${input.url ?? ""}`;
  if (toolName === "search_web")    return `Search: ${(input.queries ?? []).join(", ")}`;
  if (toolName === "computer")      return `${input.action ?? "interact"} on page`;
  if (toolName === "read_page")     return "Reading page…";
  if (toolName === "get_page_text") return "Extracting page text…";
  if (toolName === "find")          return `Find: "${input.query ?? ""}"`;
  if (toolName === "form_input")    return "Filling form…";
  if (toolName === "tabs_create")   return "Opening tab…";
  if (toolName === "draft_email")   return "Drafting email…";
  if (toolName === "todo_write")    return "Updating tasks…";
  return toolName;
}

// ═══════════════════════════════════════════════════════════════════
// Connection indicator
// ═══════════════════════════════════════════════════════════════════
let _connOk = true;
function setConnStatus(ok) {
  if (_connOk === ok) return;
  _connOk = ok;
  const bar   = document.getElementById("conn-bar");
  const dot   = document.getElementById("conn-dot");
  const label = document.getElementById("conn-label");
  if (!bar) return;
  if (ok) {
    bar.hidden = true;
    dot.className = "conn-dot ok";
  } else {
    bar.hidden = false;
    dot.className = "conn-dot err";
    if (label) label.textContent = "Reconnecting to sidecar…";
  }
  syncReconnectCallToAction();
}

// ═══════════════════════════════════════════════════════════════════
// RPC client
// ═══════════════════════════════════════════════════════════════════
function createUnavailableRpcClient() {
  return {
    connect() {},
    disconnect() {},
    reconnect() {},
    cancelPending() {},
    isOpen() {
      return false;
    },
    async call() {
      throw new Error("Panel RPC is unavailable outside the live extension runtime.");
    }
  };
}

const hasLivePanelRuntime =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof chrome !== "undefined" &&
  typeof chrome.runtime?.sendMessage === "function" &&
  typeof chrome.storage?.local?.get === "function";

let rpc = createUnavailableRpcClient();

function finalizeCurrentRun(runId, payload) {
  const terminal = deriveTerminalRunSnapshot(payload);
  if (!terminal) return false;

  if (typeof runId === "string" && runId.length > 0) {
    if (lastTerminalRunId === runId) return true;
    if (currentRunId && currentRunId !== runId) return false;
  }

  for (const item of actionItems.values()) finishActionItem(item);
  actionItems.clear();
  clearThinkingState(currentAiEl);
  currentRunState = null;

  if (currentAiEl) {
    if (terminal.errorMessage) {
      setAiAvatar(currentAiEl, "gamma-error");
      const content = currentAiEl.querySelector(".msg-content");
      const log = content?.querySelector(".action-log");
      if (content) {
        content.innerHTML = "";
        if (log) content.appendChild(log);
        const errEl = document.createElement("div");
        errEl.style.color = "oklch(62.8% .258 29.23)";
        errEl.innerHTML = SVG.warning + " " + escHtml(terminal.errorMessage || "An error occurred.");
        content.appendChild(errEl);
      }
      showToast(terminal.errorMessage || "Agent error", "error");
    } else {
      const content = currentAiEl.querySelector(".msg-content");
      const log = content?.querySelector(".action-log");
      if (content) {
        content.innerHTML = "";
        if (log) content.appendChild(log);
        if (terminal.isStopped) {
          upsertRunState(content, "stopped", "<em style='opacity:.5'>Stopped.</em>");
        } else {
          const textEl = document.createElement("div");
          textEl.innerHTML = terminal.rawText ? renderMarkdown(terminal.rawText) : "<em style='opacity:.5'>No response.</em>";
          content.appendChild(textEl);
          if (terminal.draftArtifact?.kind === "email") {
            appendDraftArtifact(currentAiEl, terminal.draftArtifact);
          }
        }
      }
      if (terminal.isStopped) {
        setAiAvatar(currentAiEl, "");
      } else {
        setAiAvatar(currentAiEl, "gamma-done");
        appendSources(currentAiEl, terminal.sources);
        setTimeout(() => setAiAvatar(currentAiEl, ""), 1600);
      }
    }
  }

  const sessionText = terminal.isStopped ? "Stopped." : terminal.rawText;
  if (activeSessionId && sessionStore && sessionText) {
    try {
      sessionStore = appendSessionMessage(sessionStore, activeSessionId, {
        role: "assistant", text: sessionText, ts: nowIso(), runId: currentRunId
      });
      sessionStore = pruneChatSessions(sessionStore);
      chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore });
    } catch {}
  }

  if (overlayActive && overlayTabId) {
    chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_STOP", tabId: overlayTabId }).catch(() => {});
    overlayActive = false;
    overlayTabId  = null;
  }
  currentControlState = "active";
  lastTerminalRunId = typeof runId === "string" && runId.length > 0 ? runId : currentRunId;

  scrollToBottom();
  transitionState("idle");
  return true;
}

function scheduleRunStatePoll(runId, delayMs = 1_000) {
  clearRunStatePollTimer();
  if (!runId || state !== "running") return;

  currentRunPollTimer = setTimeout(() => {
    currentRunPollTimer = null;
    void pollCurrentRunState(runId);
  }, delayMs);
}

async function pollCurrentRunState(runId) {
  if (!runId || state !== "running" || currentRunId !== runId) {
    return;
  }

  try {
    const snapshot = await rpc.call("AgentGetState", null, { run_id: runId });
    if (state !== "running" || currentRunId !== runId) {
      return;
    }
    currentRunState = deriveLiveRunState(currentRunState, snapshot);
    if (currentAiEl) {
      renderThinkingState(currentAiEl, currentRunState);
    }
    if (finalizeCurrentRun(runId, snapshot)) {
      return;
    }
  } catch {}

  if (state === "running" && currentRunId === runId) {
    scheduleRunStatePoll(runId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Send & stop
// ═══════════════════════════════════════════════════════════════════
async function queueSteerPrompt(promptText) {
  const text = promptText.trim();
  if (!text || state !== "running" || !currentRunId) return false;

  if (attachments.length > 0) {
    showToast("Attachments are not supported while the agent is already running.", "error");
    return false;
  }

  const resolvedPromptText = await expandMentionTokens(text);
  appendUserMsg(text);
  scrollToBottom();

  const input = document.getElementById("prompt-input");
  if (input) {
    input.value = "";
    input.style.height = "";
  }

  try {
    const stored = await new Promise(r => chrome.storage.local.get([CHAT_SESSIONS_STORAGE_KEY], r));
    sessionStore = normalizeChatSessionsStore(stored[CHAT_SESSIONS_STORAGE_KEY]);
    if (!activeSessionId) {
      sessionStore = ensureActiveSession(sessionStore);
      activeSessionId = sessionStore.activeSessionId ?? sessionStore.sessions[0]?.id ?? null;
    }
    if (activeSessionId) {
      sessionStore = appendSessionMessage(sessionStore, activeSessionId, { role: "user", text, ts: nowIso() });
      chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore });
    }
  } catch {}

  try {
    const result = await rpc.call("AgentSteer", null, {
      run_id: currentRunId,
      prompt: resolvedPromptText
    });
    showToast(currentControlState === "paused" ? "Follow-up queued. Resume to apply it." : "Follow-up queued.", "default", 1400);
    if (result?.status === "queued") {
      scheduleRunStatePoll(currentRunId, 300);
      return true;
    }
  } catch (err) {
    showToast(err?.message ?? "Failed to queue follow-up", "error");
  }

  return false;
}

async function sendPrompt(promptText) {
  const text = promptText.trim();
  if (!text) return;
  try {
    if (state === "running" && currentRunId) {
      await queueSteerPrompt(text);
      return;
    }

    const pendingAttachments = attachments.slice();
    let historyMessages = [];
    const resolvedPromptText = await expandMentionTokens(text);
    const activeTabForPrompt = await getActiveWebTab().catch(() => null);
    if (isPageContextPrompt(resolvedPromptText) && !hasAccessibleWebTab(activeTabForPrompt)) {
      showToast("Atlas cannot use this page. Switch to a normal website tab.", "error");
      return;
    }

    // Build full prompt with attachments prefix
    let fullPrompt = resolvedPromptText;
    if (pendingAttachments.length > 0) {
      try {
        const prefix = buildAttachmentPromptPrefix(pendingAttachments);
        if (prefix) fullPrompt = prefix + "\n\n" + resolvedPromptText;
      } catch {}
    }

    const imageDataUrls = pendingAttachments
      .filter(a => (a.type === "screenshot" || a.type === "image") && a.dataUrl)
      .map(a => a.dataUrl);

    setThreadVisible(true);
    appendUserMsg(text);
    scrollToBottom();

    const input = document.getElementById("prompt-input");
    if (input) { input.value = ""; input.style.height = ""; }

    // Clear attachments
    attachments = [];
    updateAttachmentPreview();

    currentAiEl  = appendAiMsg();
    streamBuffer = "";
    actionItems.clear();
    currentRunState = { steps: [] };
    currentControlState = "active";
    renderThinkingState(currentAiEl, currentRunState);
    scrollToBottom();
    transitionState("running");

    // Get the active Chrome tab ID for overlay control.
    // Note: the sidecar RPC uses its own internal string tab IDs ("tab-1", "tab-2"),
    // which differ from Chrome's integer tab IDs. Pass null as the sidecar tab_id
    // for AgentRun — the system dispatcher ignores it and the agent resolves the
    // active tab through its own CDP state.
    let tabId = null;
    try {
      const tab = await getActiveWebTab();
      overlayTabId = tab?.id ?? null;
      // tabId stays null — do not pass Chrome's integer tab ID to the sidecar RPC
      if (overlayTabId) {
        chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_START", tabId: overlayTabId }).catch(() => {});
        overlayActive = true;
      }
    } catch {}

    // Session persistence — record user message
    try {
      const stored = await new Promise(r => chrome.storage.local.get([CHAT_SESSIONS_STORAGE_KEY], r));
      sessionStore = normalizeChatSessionsStore(stored[CHAT_SESSIONS_STORAGE_KEY]);
      if (!activeSessionId) {
        sessionStore   = ensureActiveSession(sessionStore);
        activeSessionId = sessionStore.activeSessionId ?? sessionStore.sessions[0]?.id ?? null;
      }
      if (activeSessionId) {
        historyMessages = buildHistoryMessages(sessionStore, activeSessionId);
        sessionStore = appendSessionMessage(sessionStore, activeSessionId, { role: "user", text, ts: nowIso() });
        chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore });
      }
    } catch {}

    const capabilityRequest = buildTaskCapabilityRequest({
      prompt: text,
      hasImageInput: imageDataUrls.length > 0
    });
    const { provider, model, apiKey, baseUrl, missingProviderSession } = await resolveProvider(capabilityRequest);
    const panelSettings = await loadPanelSettings();
    const memoryStore = await loadMemoryStore();
    const modelConfig = normalizeModelConfig((await chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY]))?.[MODEL_CONFIG_STORAGE_KEY]);
    const memoryItems = await buildMemoryContextItems(resolvedPromptText, {
      settings: panelSettings,
      store: memoryStore,
      modelConfig
    });

    if (missingProviderSession) {
      setAiAvatar(currentAiEl, "");
      setAiContent(currentAiEl, buildProviderSetupCard(provider));
      currentAiEl?.querySelector('[data-open-settings-section="general"]')?.addEventListener("click", () => {
        void openSettingsPage("general");
      });
      transitionState("idle");
      return;
    }

    const result = await rpc.call("AgentRun", tabId, {
      prompt: fullPrompt,
      provider,
      model,
      ...(apiKey  ? { api_key:  apiKey }  : {}),
      ...(baseUrl ? { base_url: baseUrl } : {}),
      ...(historyMessages.length ? { history_messages: historyMessages, replay_history: true } : {}),
      ...(memoryItems.length ? { memory_items: memoryItems } : {}),
      ...(imageDataUrls.length ? { images: imageDataUrls, has_image_input: true } : {}),
      allow_browser_admin_pages: panelSettings.browserAdminEnabled === true,
      allow_local_shell: panelSettings.localShellEnabled === true,
      allow_extension_management: panelSettings.extensionManagementEnabled === true,
    });
    currentRunId = result?.run_id ?? result?.id ?? null;
    lastTerminalRunId = null;
    if (currentRunId) {
      scheduleRunStatePoll(currentRunId);
    }
  } catch (err) {
    const message = normalizePanelErrorMessage(err?.message ?? "Failed to start run.");
    if (currentAiEl) {
      setAiAvatar(currentAiEl, "gamma-error");
      setAiContent(currentAiEl, `<span style="color:oklch(62.8% .258 29.23)">${SVG.warning} ${escHtml(message)}</span>`);
    }
    showToast(message, "error");
    transitionState("idle");
  }
}

async function stopRun() {
  if (state !== "running") return;
  setOverlayControlState("stopping");
  try { await rpc.call("AgentStop", null, { run_id: currentRunId }); } catch {}

  for (const item of actionItems.values()) finishActionItem(item);
  actionItems.clear();
  clearThinkingState(currentAiEl);
  currentRunState = null;

  if (currentAiEl) {
    const content = currentAiEl.querySelector(".msg-content");
    if (content && !hasRenderableMessageText(content)) {
      upsertRunState(content, "stopped", "<em style='opacity:.5'>Stopped.</em>");
    }
    setAiAvatar(currentAiEl, "");
  }

  if (overlayActive && overlayTabId) {
    chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_STOP", tabId: overlayTabId }).catch(() => {});
    overlayActive = false;
    overlayTabId  = null;
  }
  currentControlState = "active";

  transitionState("idle");
}

async function pauseRun() {
  if (state !== "running" || !currentRunId) return;
  if (currentControlState === "pausing" || currentControlState === "paused" || currentControlState === "stopping") return;

  setOverlayControlState("pausing");

  try {
    const result = await rpc.call("AgentPause", null, { run_id: currentRunId });
    if (result?.status === "paused") {
      setOverlayControlState("paused");
      const content = currentAiEl?.querySelector(".msg-content");
      upsertRunState(content, "paused", "<em style='opacity:.5'>Paused — you have control.</em>");
      return;
    }
    setOverlayControlState("pausing");
  } catch (err) {
    setOverlayControlState("active");
    showToast(err?.message ?? "Failed to pause the agent", "error");
  }
}

async function resumeRun() {
  if (state !== "running" || !currentRunId || currentControlState !== "paused") return;

  try {
    const result = await rpc.call("AgentResume", null, { run_id: currentRunId });
    if (result?.status === "running") {
      setOverlayControlState("active");
      clearRunState(currentAiEl?.querySelector(".msg-content"));
    }
  } catch (err) {
    setOverlayControlState("paused");
    showToast(err?.message ?? "Failed to resume the agent", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════
// New chat
// ═══════════════════════════════════════════════════════════════════
function newChat() {
  if (state === "running") stopRun();
  if (panelMode === "settings") {
    setPanelMode("assistant");
  }
  const thread = document.getElementById("thread");
  const empty  = document.getElementById("empty-state");

  const finish = () => {
    if (thread) { thread.innerHTML = ""; thread.hidden = true; thread.style.opacity = ""; thread.style.transition = ""; }
    if (empty) { empty.hidden = false; }
    actionItems.clear();
    currentRunId = null;
    currentAiEl = null;
    streamBuffer = "";
    currentRunState = null;
    currentControlState = "active";
    attachments = [];
    updateAttachmentPreview();
    activeSessionId = null;
    const input = document.getElementById("prompt-input");
    if (input) { input.value = ""; input.style.height = ""; input.focus(); }
  };

  if (thread && !thread.hidden && thread.innerHTML.trim()) {
    thread.style.transition = "opacity .15s ease";
    thread.style.opacity    = "0";
    thread.addEventListener("transitionend", finish, { once: true });
  } else {
    finish();
  }
  syncReconnectCallToAction();
}

// ═══════════════════════════════════════════════════════════════════
// Textarea auto-resize
// ═══════════════════════════════════════════════════════════════════
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

// ═══════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════
(function init() {
  if (!hasLivePanelRuntime) return;
  rpc = createPanelRpcClient({
    wsUrl: `${SIDECAR_WS}/rpc`,
    onOpen: () => setConnStatus(true),
    onClose: () => setConnStatus(false),
  });
  const root = document.getElementById("root");
  if (!root) return;

  buildUI(root);
  setPanelMode("assistant");

  const input   = document.getElementById("prompt-input");
  const sendBtn = document.getElementById("btn-send");
  const newBtn  = document.getElementById("btn-new-chat");
  const settingsBackBtn = document.getElementById("btn-settings-back");
  const chips   = document.getElementById("chips");
  const plusBtn = document.getElementById("btn-plus");
  const modelBtn = document.getElementById("btn-model");
  const emptyReconnectButton = document.getElementById("empty-reconnect-btn");

  syncReconnectCallToAction();

  // Auto-resize + slash/@ detection
  input.addEventListener("input", () => {
    autoResize(input);
    const val = input.value;

    if (val.startsWith("/")) {
      _slashToken = val.slice(1);
      if (overlayKind !== "slash") {
        setOverlay("slash");  // properly sets data-kind and enter animation
      } else {
        // Already open as slash — just re-render with updated token
        const panel = document.getElementById("overlay-panel");
        if (panel) renderSlashPalette(panel, _slashToken);
      }
      return;
    }

    const atQuery = getTrailingAtQuery(val, input.selectionStart ?? val.length);
    if (atQuery) {
      _atToken = atQuery.query;
      if (overlayKind !== "at") {
        setOverlay("at");
      } else {
        const panel = document.getElementById("overlay-panel");
        if (panel) renderAtPalette(panel, _atToken);
      }
      return;
    }

    if (overlayKind === "slash" || overlayKind === "at") setOverlay(OVERLAY_NONE);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllOverlays();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      if (overlayKind !== OVERLAY_NONE) return; // let palette handle Enter
      e.preventDefault();
      if (state === "running" && !input.value.trim()) void stopRun();
      else void sendPrompt(input.value);
    }
  });

  // Paste image from clipboard
  input.addEventListener("paste", async (e) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find(item => item.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    const blob = imageItem.getAsFile();
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => {
      attachments.push({ type: "image", dataUrl: reader.result, name: "pasted-image.png" });
      updateAttachmentPreview();
      showToast("Image attached", "default", 1200);
    };
    reader.readAsDataURL(blob);
  });

  sendBtn.addEventListener("click", () => {
    if (state === "running" && !input.value.trim()) void stopRun();
    else void sendPrompt(input.value);
  });

  newBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(OVERLAY_NONE);
    toggleKebab();
  });
  settingsBackBtn?.addEventListener("click", () => {
    closeSettingsPage();
  });
  emptyReconnectButton?.addEventListener("click", reconnectToSidecar);
  chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip?.dataset.prompt) void sendPrompt(chip.dataset.prompt);
  });

  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(toggleOverlay(overlayKind, "plus"));
  });

  modelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(toggleOverlay(overlayKind, "model"));
  });

  // Click outside → close all overlays
  document.addEventListener("click", (e) => {
    const panel     = document.getElementById("overlay-panel");
    const composer  = document.getElementById("composer");
    const kebabWrap = document.querySelector(".kebab-wrap");

    // Don't close composer overlay if click was inside it, the composer, or the
    // kebab wrap (kebab items like "Recent chats" open the overlay — without this
    // exception the document handler fires after and immediately closes it again).
    const inComposer = composer?.contains(e.target) || panel?.contains(e.target);
    const inKebab    = kebabWrap?.contains(e.target);
    if (!inComposer && !inKebab) setOverlay(OVERLAY_NONE);

    if (!kebabWrap?.contains(e.target)) closeKebab();
  });

  const micBtn = document.getElementById("btn-mic");
  const applyMicVisibility = async () => {
    if (!micBtn) return;
    const settings = await loadPanelSettings();
    micBtn.hidden = !(settings.transcriptionEnabled && isAudioRecordingSupported());
  };
  void applyMicVisibility();
  if (isAudioRecordingSupported() && micBtn) {
    recorder = createAudioRecorderController({
      onError: (error) => {
        setMicButtonState(micBtn, "idle");
        showToast(String(error), "error");
      }
    });

    micBtn.addEventListener("click", async () => {
      if (!recorder) return;
      if (recorder.state === "recording") {
        const audioPayload = await recorder.stop();
        setMicButtonState(micBtn, "transcribing");
        showToast("Recording stopped. Transcribing…", "default", 1400);
        try {
          const transcript = await transcribeCapturedAudio(audioPayload);
          input.value = input.value.trim().length > 0 ? `${input.value.trimEnd()} ${transcript}` : transcript;
          autoResize(input);
          showToast("Transcription added", "default", 1200);
        } catch (error) {
          showToast(error?.message ?? "Transcription failed", "error");
        } finally {
          setMicButtonState(micBtn, "idle");
        }
        return;
      }

      if (recorder.state !== "idle") {
        return;
      }

      setMicButtonState(micBtn, "requesting");
      showToast("Allow microphone access to start dictation.", "default", 1400);
      await recorder.start();
      if (recorder.state === "recording") {
        setMicButtonState(micBtn, "recording");
        showToast("Recording…", "default", 900);
      } else {
        setMicButtonState(micBtn, "idle");
      }
    });
  }

  // Listen for stop from page overlay content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "ATLAS_CONTROL") return;
    if (msg.action === "stop") {
      void stopRun();
      return;
    }
    if (msg.action === "pause") {
      void pauseRun();
      return;
    }
    if (msg.action === "resume") {
      void resumeRun();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[MODEL_CONFIG_STORAGE_KEY] || changes[MODEL_CATALOG_STORAGE_KEY]) {
      void syncModelLabelFromStorage();
    }
    if (changes[PANEL_SETTINGS_STORAGE_KEY] && micBtn) {
      void applyMicVisibility();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "ATLAS_INSERT_CONTEXT_CHANGED") return;
    document.querySelectorAll(".draft-card").forEach((cardEl) => {
      const tabId = Number.parseInt(cardEl.dataset.tabId ?? "", 10);
      if (!Number.isFinite(tabId) || tabId === msg.tabId) {
        setDraftCardState(cardEl, deriveDraftInsertState(msg.context));
      }
    });
  });

  setupScrollFab();
  syncModelLabelFromStorage();
  connectSSE();
  rpc.connect();

  // Pinning is optional by default. Only show the nudge if the user explicitly enabled it.
  void loadPanelSettings().then((settings) => {
    if (settings.requireToolbarPin !== true) {
      return;
    }
    chrome.storage.local.get(["_pinHintShown"], ({ _pinHintShown }) => {
      if (_pinHintShown) {
        return;
      }
      chrome.storage.local.set({ _pinHintShown: true });
      setTimeout(() => showToast("Pin this extension to your toolbar for quick access", "default", 5000), 1200);
    });
  }).catch(() => {});
})();
