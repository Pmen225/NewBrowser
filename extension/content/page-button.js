// Atlas floating page button — top-right corner, opens the side panel.
// Injected statically via manifest content_scripts on all http/https pages.
(function () {
  'use strict';
  if (document.getElementById('atlas-fab')) return;

  /* ── Styles ─────────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #atlas-fab {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2147483644;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(18, 18, 18, 0.82);
      color: #fff;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08) inset;
      opacity: 0.72;
      transition: opacity 0.15s, transform 0.13s, box-shadow 0.15s;
      /* Keep above most UI but below overlay (2147483646) and cursor (2147483647) */
      font-family: system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    #atlas-fab:hover {
      opacity: 1;
      transform: scale(1.08);
      box-shadow: 0 4px 14px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.12) inset;
    }
    #atlas-fab:active {
      transform: scale(0.94);
      opacity: 0.9;
    }
  `;

  /* ── Button ──────────────────────────────────────────────────────────── */
  const fab = document.createElement('button');
  fab.id = 'atlas-fab';
  fab.title = 'Open Assistant';
  fab.setAttribute('aria-label', 'Open Assistant');
  fab.textContent = '✦';

  (document.documentElement || document.body).appendChild(style);
  (document.documentElement || document.body).appendChild(fab);

  /* ── Click → open side panel ─────────────────────────────────────────── */
  fab.addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
    } catch (_) {
      // Extension context invalidated — button becomes inert until page reload
    }
  });
})();
