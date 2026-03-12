export const FULL_PROMPT_PLACEHOLDER = "Ask anything...";
export const PROMPT_ARIA_LABEL = "Ask anything";
export const EMPTY_DEFAULT_COPY = "What can I help with?";

function svgGamma(cls = "") {
  return `<svg class="gamma-container ${cls}" viewBox="0 0 500 272" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse class="gamma-eye-l" cx="204.546" cy="136.363" rx="57.273" ry="57.273" fill="currentColor"/>
    <ellipse class="gamma-eye-r" cx="295.454" cy="136.363" rx="57.273" ry="57.273" fill="currentColor"/>
    <polyline class="gamma-check" points="155,148 200,190 330,95" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

const SHELL_ICONS = {
  chevronLeft: `<svg viewBox="0 0 16 16" fill="none"><path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  send: `<svg viewBox="0 0 16 16" fill="none"><path d="M13.5 8L3 3l2.5 5L3 13l10.5-5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  mic: `<svg viewBox="0 0 16 16" fill="none"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 7.5a5.5 5.5 0 0011 0M8 15v-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  dotsThree: `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></svg>`
};

export function buildPanelShellMarkup() {
  return `
<div class="assistant-shell">
  <header class="panel-header">
    <div class="panel-header-brand">
      <div class="brand-icon" id="panel-brand-icon">${svgGamma("")}</div>
      <span id="panel-header-title">Assistant</span>
    </div>
    <div class="panel-header-actions" id="panel-header-actions-main">
      <div class="kebab-wrap">
        <button class="icon-btn" id="btn-new-chat" title="Open menu" aria-label="Open menu">${SHELL_ICONS.dotsThree}</button>
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
      <button class="scroll-fab" id="scroll-fab" hidden title="Scroll to bottom" aria-label="Scroll to bottom">${SHELL_ICONS.chevronDown}</button>
    </div>

    <div class="composer-wrap">
      <div class="composer-blur"></div>
      <div id="overlay-panel" class="overlay-panel composer-overlay" hidden></div>
      <div class="composer" id="composer">
        <div id="attachment-preview" class="attachment-preview" hidden></div>
        <textarea id="prompt-input" rows="1" placeholder="${FULL_PROMPT_PLACEHOLDER}" autocomplete="off" spellcheck="true" aria-label="${PROMPT_ARIA_LABEL}"></textarea>
        <div class="composer-dock">
          <button id="btn-plus" class="dock-btn dock-btn--icon" title="Add content" aria-label="Add content">${SHELL_ICONS.plus}</button>
          <div class="dock-right">
            <button id="btn-model" class="dock-btn dock-btn--pill" title="Select model" aria-label="Select model">
              <span id="model-label">Auto</span>
              ${SHELL_ICONS.chevronDown}
            </button>
            <button id="btn-mic" class="dock-btn dock-btn--icon" title="Voice input" aria-label="Voice input" hidden>${SHELL_ICONS.mic}</button>
            <button id="btn-send" title="Send" aria-label="Send">${SHELL_ICONS.send}</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toast-container"></div>
</div>`;
}
