// panel.js — Atlas Assistant Panel (P1+P2+P3 complete)
// RPC: ws://127.0.0.1:3210/rpc   SSE: http://127.0.0.1:3210/events
import { createPanelRpcClient } from "./lib/rpc.js";
import {
  normalizeModelConfig, normalizeModelCatalog, chooseAutoModel,
  MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY
} from "./lib/model-config.js";
import { OVERLAY_NONE, normalizeOverlayKind, toggleOverlay } from "./lib/overlay-controller.js";
import { listMatchingShortcuts, SHORTCUTS_STORAGE_KEY } from "./lib/shortcuts.js";
import { readImportedAttachments, buildAttachmentPromptPrefix } from "./lib/file-import.js";
import { createDictationController, isDictationSupported } from "./lib/speech.js";
import {
  normalizeChatSessionsStore, ensureActiveSession,
  appendSessionMessage, pruneChatSessions, CHAT_SESSIONS_STORAGE_KEY
} from "./lib/recent-chats.js";
import { readUnlockedProviders } from "./lib/provider-session.js";

const SIDECAR_WS   = "ws://127.0.0.1:3210";
const EVENTS_URL   = "http://127.0.0.1:3210/events";

// Returns the active web tab (http/https), skipping the side panel itself.
async function getActiveWebTab() {
  const WEB = ["http://*/*", "https://*/*"];
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true, url: WEB });
  if (!tab) {
    const all = await chrome.tabs.query({ currentWindow: true, url: WEB });
    tab = all[0] || null;
  }
  return tab;
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
  todo_write:    SVG.check,
};

// ═══════════════════════════════════════════════════════════════════
// Built-in slash shortcuts
// ═══════════════════════════════════════════════════════════════════
const BUILTIN_SHORTCUTS = [
  { id: "bi:summarize",  trigger: "/summarize",  label: "Summarize",   instructions: "Summarize this page for me",                          isBuiltIn: true },
  { id: "bi:explain",    trigger: "/explain",    label: "Explain",     instructions: "Explain what this page is about",                     isBuiltIn: true },
  { id: "bi:search",     trigger: "/search",     label: "Web search",  instructions: "Search the web for: ",                               isBuiltIn: true },
  { id: "bi:screenshot", trigger: "/screenshot", label: "Screenshot",  instructions: "Take a screenshot and describe what you see",         isBuiltIn: true },
  { id: "bi:todo",       trigger: "/todo",       label: "Todo list",   instructions: "Create a todo list for tasks on this page",           isBuiltIn: true },
  { id: "bi:fill",       trigger: "/fill",       label: "Fill form",   instructions: "Find and fill out the form on this page",             isBuiltIn: true },
];

// ═══════════════════════════════════════════════════════════════════
// DOM build
// ═══════════════════════════════════════════════════════════════════
function buildUI(root) {
  root.innerHTML = `
<div class="assistant-shell">
  <header class="panel-header">
    <div class="panel-header-brand">
      <div class="brand-icon">${svgGamma("")}</div>
      <span>Assistant</span>
    </div>
    <div class="panel-header-actions">
      <button class="icon-btn" id="btn-new-chat" title="New chat" aria-label="New chat">${SVG.newChat}</button>
      <div class="kebab-wrap">
        <button class="icon-btn" id="btn-kebab" title="More options" aria-label="More options">${SVG.dotsThree}</button>
        <div id="kebab-menu" class="overlay-panel kebab-menu" hidden></div>
      </div>
    </div>
  </header>

  <div id="conn-bar" class="conn-bar" hidden>
    <span class="conn-dot" id="conn-dot"></span>
    <span id="conn-label">Connecting…</span>
  </div>

  <div class="stage-wrap">
    <div class="stage" id="stage">
      <div class="empty-state" id="empty-state">
        <div class="hero-gamma">${svgGamma("gamma-thinking")}</div>
        <p class="empty-title">What can I help with?</p>
        <div class="suggested-chips" id="chips">
          <button class="chip" data-prompt="Summarize this page for me">✦ Summarize</button>
          <button class="chip" data-prompt="What can I do on this page?">What can I do here?</button>
          <button class="chip" data-prompt="Tell me more about this page">Learn more</button>
          <button class="chip" data-prompt="Find the main call to action on this page">Find CTA</button>
        </div>
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
      <textarea id="prompt-input" rows="1" placeholder="Ask anything…" autocomplete="off" spellcheck="true" aria-label="Message input"></textarea>
      <div class="composer-dock">
        <button id="btn-plus" class="dock-btn dock-btn--icon" title="Add content" aria-label="Add content">${SVG.plus}</button>
        <div class="dock-right">
          <button id="btn-model" class="dock-btn dock-btn--pill" title="Select model" aria-label="Select model">
            <span id="model-label">Auto ✦</span>
            ${SVG.chevronDown}
          </button>
          <button id="btn-mic" class="dock-btn dock-btn--icon" title="Voice input" aria-label="Voice input" hidden>${SVG.mic}</button>
          <button id="btn-send" title="Send" aria-label="Send">${SVG.send}</button>
        </div>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toast-container"></div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// Markdown renderer (full)
// ═══════════════════════════════════════════════════════════════════
function renderMarkdown(raw) {
  let text = raw.replace(/<\/?answer>/gi, "").trim();
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

// ═══════════════════════════════════════════════════════════════════
// State machine
// ═══════════════════════════════════════════════════════════════════
let state        = "idle";
let currentRunId = null;
let currentAiEl  = null;
let streamBuffer = "";

// Overlay + attachment state
let overlayKind     = OVERLAY_NONE;
let attachments     = [];
let sessionStore    = null;
let activeSessionId = null;
let dictation       = null;

// Page overlay state
let overlayTabId  = null;
let overlayActive = false;

function transitionState(newState) {
  state = newState;
  const btn   = document.getElementById("btn-send");
  const input = document.getElementById("prompt-input");
  if (!btn) return;

  if (newState === "running") {
    btn.innerHTML = SVG.stop;
    btn.classList.add("stop-mode");
    btn.disabled  = false;
    if (input) input.disabled = true;
  } else {
    btn.innerHTML = SVG.send;
    btn.classList.remove("stop-mode");
    btn.disabled  = false;
    if (input) { input.disabled = false; input.focus(); }
    currentRunId = null;
    currentAiEl  = null;
    streamBuffer = "";
  }
}

// ═══════════════════════════════════════════════════════════════════
// Provider / model resolution
// ═══════════════════════════════════════════════════════════════════
async function resolveProvider() {
  const stored = await new Promise(r =>
    chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY, MODEL_CATALOG_STORAGE_KEY], r)
  );
  const config   = normalizeModelConfig(stored[MODEL_CONFIG_STORAGE_KEY]);
  const catalog  = normalizeModelCatalog(stored[MODEL_CATALOG_STORAGE_KEY] ?? []);

  // Read saved provider sessions (set via options page)
  const sessions = await readUnlockedProviders();
  const preferred = config.selectedProvider ?? "google";
  const session = sessions.find(s => s.provider === preferred) ?? sessions[0] ?? null;

  let provider = session?.provider ?? preferred;
  let model    = config.selectedModelId ?? "auto";
  let apiKey   = session?.apiKey ?? "";
  let baseUrl  = session?.baseUrl ?? undefined;

  if (config.defaultModelMode === "auto" && catalog.length > 0) {
    const chosen = chooseAutoModel(catalog, {}, config);
    if (chosen) { provider = chosen.chosenProvider; model = chosen.chosenModelId; }
  }

  return { provider, model, apiKey, baseUrl };
}

// ═══════════════════════════════════════════════════════════════════
// Message rendering
// ═══════════════════════════════════════════════════════════════════
function setThreadVisible(v) {
  const empty  = document.getElementById("empty-state");
  const thread = document.getElementById("thread");
  if (empty)  empty.hidden  =  v;
  if (thread) thread.hidden = !v;
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
  if (gc) gc.className = `gamma-container${animClass ? " " + animClass : ""}`;
}

function setAiContent(msgEl, html) {
  const c = msgEl?.querySelector(".msg-content");
  if (c) c.innerHTML = html;
}

function ensureActionLog(msgEl) {
  let log = msgEl.querySelector(".action-log");
  if (!log) {
    log = document.createElement("div");
    log.className = "action-log";
    const wrap = msgEl.querySelector(".msg-content");
    if (wrap) wrap.prepend(log);
  }
  return log;
}

function appendActionItem(msgEl, toolName, label) {
  const log  = ensureActionLog(msgEl);
  const item = document.createElement("div");
  item.className = "action-item";
  const icon = TOOL_ICONS[toolName] ?? SVG.cursor;
  item.innerHTML = `
    <span class="action-item-icon">${icon}</span>
    <span class="action-item-label">${escHtml(label)}</span>
    <span class="action-item-spinner"></span>`;
  log.appendChild(item);
  return item;
}

function finishActionItem(itemEl) {
  if (!itemEl) return;
  itemEl.classList.add("done");
  const spinner = itemEl.querySelector(".action-item-spinner");
  if (spinner) spinner.replaceWith((() => {
    const s = document.createElement("span");
    s.className = "action-item-icon";
    s.innerHTML = SVG.check;
    s.style.color = "oklch(72.3% .191 149.58)";
    return s;
  })());
}

function appendSources(msgEl, sources) {
  if (!sources?.length) return;
  const content = msgEl.querySelector(".msg-content");
  if (!content) return;
  const row = document.createElement("div");
  row.className = "sources-row";
  for (const src of sources.slice(0, 6)) {
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
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add("hiding");
    t.addEventListener("animationend", () => t.remove(), { once: true });
  }, durationMs);
}

// ═══════════════════════════════════════════════════════════════════
// Scroll helpers
// ═══════════════════════════════════════════════════════════════════
function scrollToBottom() {
  const stage = document.getElementById("stage");
  if (stage) stage.scrollTop = stage.scrollHeight;
}

function setupScrollFab() {
  const stage = document.getElementById("stage");
  const fab   = document.getElementById("scroll-fab");
  if (!stage || !fab) return;
  const update = () => {
    fab.hidden = (stage.scrollHeight - stage.scrollTop - stage.clientHeight) < 80;
  };
  stage.addEventListener("scroll", update, { passive: true });
  fab.addEventListener("click", () => { scrollToBottom(); fab.hidden = true; });
}

// ═══════════════════════════════════════════════════════════════════
// Overlay state machine
// ═══════════════════════════════════════════════════════════════════
function setOverlay(kind) {
  overlayKind = normalizeOverlayKind(kind);
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
  // Re-animate
  panel.style.animation = "none";
  panel.offsetHeight; // reflow
  panel.style.animation = "";

  if (overlayKind === "slash")   { renderSlashPalette(panel, _slashToken);   return; }
  if (overlayKind === "at")      { renderAtPalette(panel);                   return; }
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
      </button>`).join("")}`;

  setupPaletteNav(panel);
  panel.querySelectorAll(".palette-item").forEach(btn => {
    btn.addEventListener("click", () => {
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
async function renderAtPalette(panel) {
  let tab = null;
  try {
    tab = await getActiveWebTab();
  } catch {}

  const items = [
    { id: "page", label: "Current page",  desc: tab?.title ?? "Active tab",       icon: SVG.globe,       inject: `[page: "${escHtml(tab?.title ?? "page")}" — ${tab?.url ?? ""}]` },
    { id: "shot", label: "Screenshot",    desc: "Capture current page",           icon: SVG.camera,      inject: null, action: "screenshot" },
    { id: "tabs", label: "All open tabs", desc: "Reference all open tabs",        icon: SVG.newChat,     inject: null, action: "allTabs"    },
  ];

  panel.innerHTML = `
    <div class="palette-header">Context</div>
    ${items.map(item => `
      <button class="palette-item" data-at-id="${escHtml(item.id)}">
        <span class="pi-icon">${item.icon}</span>
        <span class="pi-label">${escHtml(item.label)}</span>
        <span class="pi-desc">${escHtml(item.desc)}</span>
      </button>`).join("")}`;

  setupPaletteNav(panel);
  panel.querySelectorAll(".palette-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = items.find(i => i.id === btn.dataset.atId);
      if (!item) return;
      const input = document.getElementById("prompt-input");
      if (!input) return;
      const val    = input.value;
      const atPos  = val.lastIndexOf("@");
      const before = atPos >= 0 ? val.slice(0, atPos) : val;

      if (item.action === "screenshot") {
        try {
          const resp = await chrome.runtime.sendMessage({ action: "captureScreenshot" });
          if (resp?.dataUrl) {
            attachments.push({ type: "screenshot", dataUrl: resp.dataUrl, name: "screenshot.png" });
            updateAttachmentPreview();
            input.value = before;
            showToast("Screenshot captured", "default", 1600);
          }
        } catch { showToast("Screenshot failed", "error"); }
      } else if (item.action === "allTabs") {
        try {
          const tabs    = await chrome.tabs.query({ currentWindow: true });
          const tabList = tabs.map(t => `${t.title} — ${t.url}`).join("\n");
          input.value   = before + `[tabs:\n${tabList}\n]`;
        } catch { input.value = before + "[all tabs]"; }
      } else if (item.inject) {
        input.value = before + item.inject;
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
      if (resp?.dataUrl) {
        attachments.push({ type: "screenshot", dataUrl: resp.dataUrl, name: "screenshot.png" });
        updateAttachmentPreview();
        showToast("Screenshot captured", "default", 1600);
      }
    } catch { showToast("Screenshot failed", "error"); }
  });

  document.getElementById("plus-control")?.addEventListener("click", async () => {
    setOverlay(OVERLAY_NONE);
    try {
      const tab = await getActiveWebTab();
      if (tab?.id) {
        chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_START", tabId: tab.id }).catch(() => {});
        overlayTabId  = tab.id;
        overlayActive = true;
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
      <span class="pi-label">Auto ✦</span>
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
          <button class="palette-item${isSelected ? " palette-item--active" : ""}" data-model-id="${escHtml(m.id)}">
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
    updateModelLabel("Auto ✦");
    setOverlay(OVERLAY_NONE);
  });

  panel.querySelectorAll("[data-model-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const modelId = btn.dataset.modelId;
      const s = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY], r));
      const c = normalizeModelConfig(s[MODEL_CONFIG_STORAGE_KEY]);
      c.defaultModelMode = "manual";
      c.selectedModelId  = modelId;
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
  const sessions = store.sessions ?? [];

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
        <span class="pi-label" style="font-size:12.5px">${escHtml(s.title ?? "Chat")}</span>
        <span class="pi-desc">${relTime(s.updatedAt ?? s.createdAt)}</span>
      </button>`).join("")}`;

  setupPaletteNav(panel);
  panel.querySelectorAll("[data-session-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const session = sessions.find(s => s.id === btn.dataset.sessionId);
      if (session) restoreSession(session);
      setOverlay(OVERLAY_NONE);
    });
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
      appendUserMsg(msg.text ?? "");
    } else if (msg.role === "assistant") {
      const el = appendAiMsg();
      const content = el.querySelector(".msg-content");
      if (content) content.innerHTML = msg.text ? renderMarkdown(msg.text) : "<em style='opacity:.5'>No response.</em>";
    }
  }
  scrollToBottom();
  activeSessionId = session.id;
}

// ═══════════════════════════════════════════════════════════════════
// Kebab menu
// ═══════════════════════════════════════════════════════════════════
let _kebabOpen = false;

function openKebab() {
  const menu = document.getElementById("kebab-menu");
  if (!menu) return;
  _kebabOpen = true;
  menu.hidden = false;
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
      <span class="pi-label">Settings ↗</span>
    </button>`;

  document.getElementById("kebab-new-chat")?.addEventListener("click", () => {
    closeKebab(); newChat();
  });
  document.getElementById("kebab-recents")?.addEventListener("click", () => {
    closeKebab(); setOverlay("recents");
  });
  document.getElementById("kebab-settings")?.addEventListener("click", () => {
    closeKebab(); chrome.runtime.openOptionsPage();
  });
}

function closeKebab() {
  _kebabOpen = false;
  const menu = document.getElementById("kebab-menu");
  if (menu) { menu.hidden = true; menu.innerHTML = ""; }
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
  preview.innerHTML = attachments.map((a, i) => `
    <div class="attachment-chip">
      <span class="attach-icon">${a.type === "screenshot" ? SVG.camera : SVG.paperclip}</span>
      <span class="attach-name">${escHtml(a.name ?? "file")}</span>
      <button class="attachment-remove" data-idx="${i}" aria-label="Remove">${SVG.xMark}</button>
    </div>`).join("");
  preview.querySelectorAll(".attachment-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (!isNaN(idx)) { attachments.splice(idx, 1); updateAttachmentPreview(); }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Model label helper
// ═══════════════════════════════════════════════════════════════════
function updateModelLabel(text) {
  const el = document.getElementById("model-label");
  if (el) el.textContent = text;
}

async function loadInitialModelLabel() {
  try {
    const stored = await new Promise(r => chrome.storage.local.get([MODEL_CONFIG_STORAGE_KEY], r));
    const config = normalizeModelConfig(stored[MODEL_CONFIG_STORAGE_KEY]);
    if (config.defaultModelMode === "auto" || config.selectedModelId === "auto") {
      updateModelLabel("Auto ✦");
    } else if (config.selectedModelId) {
      const id       = config.selectedModelId;
      const shortName = id.includes("/") ? id.split("/").pop() : id;
      updateModelLabel(shortName.slice(0, 18));
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// SSE connection
// ═══════════════════════════════════════════════════════════════════
let sseSource   = null;
let actionItems = new Map();

function connectSSE() {
  if (sseSource) return;
  sseSource = new EventSource(EVENTS_URL);

  sseSource.addEventListener("open",  () => setConnStatus(true));
  sseSource.addEventListener("error", () => {
    setConnStatus(false);
    sseSource.close();
    sseSource = null;
    setTimeout(connectSSE, 3000);
  });
  sseSource.addEventListener("heartbeat", () => setConnStatus(true));

  // status: agent_run_updated
  sseSource.addEventListener("status", (e) => {
    try {
      const env  = JSON.parse(e.data);
      const p    = env?.payload ?? env;
      if (p?.run_id !== currentRunId) return;
      const s    = p?.status;

      if (s === "running" && currentAiEl) {
        setAiAvatar(currentAiEl, "gamma-thinking");
      }

      if (s === "tool_start" && currentAiEl) {
        const toolName = p?.tool_name ?? "tool";

        // Page overlay — inject/move cursor on computer tool
        if (toolName === "computer" && overlayTabId) {
          if (!overlayActive) {
            chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_START", tabId: overlayTabId }).catch(() => {});
            overlayActive = true;
          }
          const coord = p?.tool_input?.coordinate;
          if (Array.isArray(coord) && coord.length === 2) {
            chrome.runtime.sendMessage({ type: "ATLAS_CURSOR", tabId: overlayTabId, x: coord[0], y: coord[1] }).catch(() => {});
          }
        }
        // Forward status text to overlay
        if (overlayActive && overlayTabId) {
          const statusText = formatToolLabel(toolName, p?.tool_input);
          chrome.runtime.sendMessage({ type: "ATLAS_STATUS_UPDATE", tabId: overlayTabId, text: statusText }).catch(() => {});
        }

        const label = p?.tool_label ?? formatToolLabel(toolName, p?.tool_input);
        const item  = appendActionItem(currentAiEl, toolName, label);
        if (p?.tool_call_id) actionItems.set(p.tool_call_id, item);
        setAiAvatar(currentAiEl, "gamma-scanning");
        scrollToBottom();
      }

      if (s === "tool_done" && p?.tool_call_id) {
        const item = actionItems.get(p.tool_call_id);
        finishActionItem(item);
        actionItems.delete(p.tool_call_id);
        if (p?.screenshot_b64 && currentAiEl) {
          const content = currentAiEl.querySelector(".msg-content");
          if (content) {
            const imgWrap = document.createElement("div");
            imgWrap.className = "agent-screenshot";
            const img = document.createElement("img");
            img.src = "data:image/png;base64," + p.screenshot_b64;
            img.alt = "Screenshot";
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
      if (p?.run_id !== currentRunId) return;
      const delta = p?.token ?? p?.delta ?? "";
      if (!delta || !currentAiEl) return;

      streamBuffer += delta;
      setAiAvatar(currentAiEl, "gamma-streaming");
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
    try {
      const env     = JSON.parse(e.data);
      const p       = env?.payload ?? env;
      if (p?.run_id !== currentRunId) return;

      const rawText = (p?.final_answer ?? p?.content ?? "").replace(/<\/?answer>/gi, "").trim();
      const errMsg  = p?.error_message;
      const sources = p?.sources ?? p?.citations ?? [];

      for (const item of actionItems.values()) finishActionItem(item);
      actionItems.clear();
      document.getElementById("thinking-row")?.remove();

      if (currentAiEl) {
        if (errMsg) {
          setAiAvatar(currentAiEl, "gamma-error");
          const content = currentAiEl.querySelector(".msg-content");
          const log = content?.querySelector(".action-log");
          if (content) {
            content.innerHTML = "";
            if (log) content.appendChild(log);
            const errEl = document.createElement("div");
            errEl.style.color = "oklch(62.8% .258 29.23)";
            errEl.innerHTML = SVG.warning + " " + escHtml(errMsg || "An error occurred.");
            content.appendChild(errEl);
          }
          showToast(errMsg || "Agent error", "error");
        } else {
          const content = currentAiEl.querySelector(".msg-content");
          const log = content?.querySelector(".action-log");
          if (content) {
            content.innerHTML = "";
            if (log) content.appendChild(log);
            const textEl = document.createElement("div");
            textEl.innerHTML = rawText ? renderMarkdown(rawText) : "<em style='opacity:.5'>No response.</em>";
            content.appendChild(textEl);
          }
          setAiAvatar(currentAiEl, "gamma-done");
          appendSources(currentAiEl, sources);
          setTimeout(() => setAiAvatar(currentAiEl, ""), 1600);
        }
      }

      // Session persistence — save assistant message
      if (activeSessionId && sessionStore && rawText) {
        try {
          sessionStore = appendSessionMessage(sessionStore, activeSessionId, {
            role: "assistant", text: rawText, ts: Date.now(), runId: currentRunId
          });
          sessionStore = pruneChatSessions(sessionStore);
          chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore });
        } catch {}
      }

      // Remove page overlay
      if (overlayActive && overlayTabId) {
        chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_STOP", tabId: overlayTabId }).catch(() => {});
        overlayActive = false;
        overlayTabId  = null;
      }

      transitionState("idle");
      scrollToBottom();
    } catch {}
  });
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
}

// ═══════════════════════════════════════════════════════════════════
// RPC client
// ═══════════════════════════════════════════════════════════════════
const rpc = createPanelRpcClient({
  wsUrl:   `${SIDECAR_WS}/rpc`,
  onOpen:  () => setConnStatus(true),
  onClose: () => setConnStatus(false),
});

// ═══════════════════════════════════════════════════════════════════
// Send & stop
// ═══════════════════════════════════════════════════════════════════
async function sendPrompt(promptText) {
  const text = promptText.trim();
  if (!text || state === "running") return;

  // Build full prompt with attachments prefix
  let fullPrompt = text;
  if (attachments.length > 0) {
    try {
      const prefix = buildAttachmentPromptPrefix(attachments);
      if (prefix) fullPrompt = prefix + "\n\n" + text;
    } catch {}
  }

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
  scrollToBottom();
  transitionState("running");

  let tabId = null;
  try {
    const tab = await getActiveWebTab();
    tabId = tab?.id ?? null;
    overlayTabId = tabId;
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
      sessionStore = appendSessionMessage(sessionStore, activeSessionId, { role: "user", text, ts: Date.now() });
      chrome.storage.local.set({ [CHAT_SESSIONS_STORAGE_KEY]: sessionStore });
    }
  } catch {}

  const { provider, model, apiKey, baseUrl } = await resolveProvider();

  try {
    const result = await rpc.call("AgentRun", tabId, {
      prompt: fullPrompt,
      provider,
      model,
      ...(apiKey  ? { api_key:  apiKey }  : {}),
      ...(baseUrl ? { base_url: baseUrl } : {}),
    });
    currentRunId = result?.run_id ?? result?.id ?? null;
  } catch (err) {
    setAiAvatar(currentAiEl, "gamma-error");
    setAiContent(currentAiEl, `<span style="color:oklch(62.8% .258 29.23)">${SVG.warning} ${escHtml(err?.message ?? "Failed to reach sidecar.")}</span>`);
    showToast(err?.message ?? "Connection failed", "error");
    transitionState("idle");
  }
}

async function stopRun() {
  if (state !== "running") return;
  try { await rpc.call("AgentStop", null, { run_id: currentRunId }); } catch {}

  for (const item of actionItems.values()) finishActionItem(item);
  actionItems.clear();
  document.getElementById("thinking-row")?.remove();

  if (currentAiEl) {
    const content = currentAiEl.querySelector(".msg-content");
    if (content && !content.textContent.trim()) {
      content.innerHTML = "<em style='opacity:.5'>Stopped.</em>";
    }
    setAiAvatar(currentAiEl, "");
  }

  if (overlayActive && overlayTabId) {
    chrome.runtime.sendMessage({ type: "ATLAS_OVERLAY_STOP", tabId: overlayTabId }).catch(() => {});
    overlayActive = false;
    overlayTabId  = null;
  }

  transitionState("idle");
}

// ═══════════════════════════════════════════════════════════════════
// New chat
// ═══════════════════════════════════════════════════════════════════
function newChat() {
  if (state === "running") stopRun();
  const thread = document.getElementById("thread");
  if (thread) { thread.innerHTML = ""; thread.hidden = true; }
  const empty = document.getElementById("empty-state");
  if (empty) empty.hidden = false;
  actionItems.clear();
  attachments = [];
  updateAttachmentPreview();
  activeSessionId = null;
  const input = document.getElementById("prompt-input");
  if (input) { input.value = ""; input.style.height = ""; input.focus(); }
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
  const root = document.getElementById("root");
  if (!root) return;

  buildUI(root);

  const input   = document.getElementById("prompt-input");
  const sendBtn = document.getElementById("btn-send");
  const newBtn  = document.getElementById("btn-new-chat");
  const chips   = document.getElementById("chips");
  const plusBtn = document.getElementById("btn-plus");
  const modelBtn = document.getElementById("btn-model");
  const kebabBtn = document.getElementById("btn-kebab");

  // Auto-resize + slash/@ detection
  input.addEventListener("input", () => {
    autoResize(input);
    const val = input.value;

    if (val.startsWith("/")) {
      _slashToken = val.slice(1);
      if (overlayKind !== "slash") overlayKind = "slash";
      renderSlashPalette(document.getElementById("overlay-panel"), _slashToken);
      document.getElementById("overlay-panel").hidden = false;
      return;
    }

    if (/@\w*$/.test(val)) {
      if (overlayKind !== "at") setOverlay("at");
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
      if (state === "running") stopRun();
      else sendPrompt(input.value);
    }
  });

  sendBtn.addEventListener("click", () => {
    if (state === "running") stopRun();
    else sendPrompt(input.value);
  });

  newBtn.addEventListener("click", newChat);
  chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip?.dataset.prompt) sendPrompt(chip.dataset.prompt);
  });

  plusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(toggleOverlay(overlayKind, "plus"));
  });

  modelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(toggleOverlay(overlayKind, "model"));
  });

  kebabBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOverlay(OVERLAY_NONE);
    toggleKebab();
  });

  // Click outside → close all overlays
  document.addEventListener("click", (e) => {
    const panel    = document.getElementById("overlay-panel");
    const composer = document.getElementById("composer");
    const kebab    = document.getElementById("kebab-menu");
    const kebabWrap = document.querySelector(".kebab-wrap");

    const inComposer = composer?.contains(e.target) || panel?.contains(e.target);
    if (!inComposer) setOverlay(OVERLAY_NONE);

    if (!kebabWrap?.contains(e.target)) closeKebab();
  });

  // Mic button
  if (isDictationSupported()) {
    const micBtn = document.getElementById("btn-mic");
    if (micBtn) {
      micBtn.hidden = false;
      dictation = createDictationController({
        onText:  (t) => { input.value += t; autoResize(input); },
        onError: (e) => showToast(String(e), "error"),
      });
      micBtn.addEventListener("click", () => {
        dictation.toggle();
        micBtn.classList.toggle("active", dictation.active);
      });
    }
  }

  // Listen for stop from page overlay content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ATLAS_CONTROL" && msg.action === "stop") stopRun();
  });

  setupScrollFab();
  loadInitialModelLabel();
  connectSSE();
  rpc.connect();
})();
