// Atlas Agent Overlay — v3, matches Atlas reference UI.
// Light dim + white dot grid + arrow cursor + floating 2-row card bar.
(function () {
  'use strict';
  if (document.getElementById('atlas-agent-overlay-root')) return;

  // Sentinel so guard works even if <body> is replaced
  const root = document.createElement('div');
  root.id = 'atlas-agent-overlay-root';
  root.style.cssText = 'display:none!important;pointer-events:none';
  document.documentElement.appendChild(root);

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  const style = document.createElement('style');
  style.id = 'atlas-agent-styles';
  style.textContent = `
    /* ── Dim overlay ─────────────────────────────────────────────────────── */
    #atlas-dim {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.18);
      pointer-events: none;
      z-index: 2147483638;
      opacity: 0;
      transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1);
    }
    #atlas-dim.atlas-in  { opacity: 1; }
    #atlas-dim.atlas-out { opacity: 0; transition: opacity 0.4s ease; }
    #atlas-dim.paused    { background: rgba(0,0,0,0.08); }

    /* ── White dot grid ──────────────────────────────────────────────────── */
    #atlas-dots {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 2147483639;
      background-image: radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 0);
      background-size: 22px 22px;
      -webkit-mask-image: radial-gradient(ellipse 88% 82% at 50% 50%, black 30%, transparent 100%);
              mask-image: radial-gradient(ellipse 88% 82% at 50% 50%, black 30%, transparent 100%);
      opacity: 0;
      transition: opacity 0.7s ease 0.2s;
    }
    #atlas-dots.atlas-in  { opacity: 1; }
    #atlas-dots.atlas-out { opacity: 0; transition: opacity 0.3s ease; }

    /* ── Arrow cursor ────────────────────────────────────────────────────── */
    #atlas-cursor {
      position: fixed;
      width: 24px; height: 24px;
      pointer-events: none;
      z-index: 2147483647;
      opacity: 0;
      transition:
        left    0.55s cubic-bezier(0.16,1,0.3,1),
        top     0.55s cubic-bezier(0.16,1,0.3,1),
        opacity 0.30s ease;
    }
    #atlas-cursor.atlas-visible { opacity: 1; }
    #atlas-cursor svg {
      width: 24px; height: 24px;
      filter: drop-shadow(0 1px 4px rgba(0,0,0,0.50));
      transition: transform 0.12s cubic-bezier(0.4,0,0.2,1);
    }
    #atlas-cursor.atlas-click svg { transform: scale(0.78); }

    /* ── Label capsule ───────────────────────────────────────────────────── */
    #atlas-label {
      position: fixed;
      padding: 5px 13px;
      border-radius: 999px;
      background: rgba(12,12,18,0.84);
      backdrop-filter: blur(14px) saturate(1.6);
      -webkit-backdrop-filter: blur(14px) saturate(1.6);
      border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.90);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      font-size: 12px; font-weight: 500; letter-spacing: -0.01em;
      white-space: nowrap;
      pointer-events: none;
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(3px);
      transition:
        left      0.55s cubic-bezier(0.16,1,0.3,1),
        top       0.55s cubic-bezier(0.16,1,0.3,1),
        opacity   0.25s ease,
        transform 0.25s ease;
    }
    #atlas-label.atlas-visible { opacity: 1; transform: translateY(0); }

    /* ── Click ripple ────────────────────────────────────────────────────── */
    .atlas-ripple {
      position: fixed; border-radius: 50%;
      pointer-events: none; z-index: 2147483646;
      width: 28px; height: 28px;
      border: 1.5px solid rgba(0,122,255,0.70);
      transform: translate(-50%,-50%) scale(0);
      animation: _atlas-ripple 0.62s cubic-bezier(0.16,1,0.3,1) both;
    }
    .atlas-ripple-outer {
      border-color: rgba(0,122,255,0.30);
      animation: _atlas-ripple 0.84s cubic-bezier(0.16,1,0.3,1) 0.05s both;
    }
    @keyframes _atlas-ripple {
      0%   { transform: translate(-50%,-50%) scale(0);   opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(3.8); opacity: 0; }
    }

    /* ── Floating card bar ───────────────────────────────────────────────── */
    #atlas-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      width: 360px;
      z-index: 2147483648;
      background: rgba(20,20,28,0.93);
      backdrop-filter: blur(32px) saturate(1.8);
      -webkit-backdrop-filter: blur(32px) saturate(1.8);
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.09);
      box-shadow:
        0 0 0 1px rgba(0,122,255,0.35),
        0 0 20px 6px rgba(0,122,255,0.16),
        0 8px 32px rgba(0,0,0,0.48);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      pointer-events: auto;
      overflow: hidden;
      opacity: 0;
      transition:
        opacity   0.42s cubic-bezier(0.16,1,0.3,1),
        transform 0.42s cubic-bezier(0.16,1,0.3,1);
    }
    #atlas-bar.atlas-in {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    #atlas-bar.atlas-out {
      opacity: 0;
      transform: translateX(-50%) translateY(16px);
      transition: opacity 0.32s ease, transform 0.32s ease;
    }
    #atlas-bar * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Row 1 — logged-in status */
    #atlas-bar-row1 {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    #atlas-bar-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #34c759; flex-shrink: 0;
      animation: _atlas-green-pulse 2s ease-in-out infinite;
    }
    #atlas-bar-dot.paused { background: #ff9f0a; animation: none; }
    @keyframes _atlas-green-pulse {
      0%,100% { box-shadow: 0 0 0 0   rgba(52,199,89,0.50); }
      55%     { box-shadow: 0 0 0 4px rgba(52,199,89,0);    }
    }
    #atlas-bar-status {
      font-size: 11.5px; font-weight: 500;
      color: rgba(255,255,255,0.62); letter-spacing: -0.01em;
      flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* Row 2 — site + buttons */
    #atlas-bar-row2 {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px 10px 14px;
    }
    #atlas-bar-favicon {
      width: 16px; height: 16px; border-radius: 3px;
      flex-shrink: 0; object-fit: contain;
    }
    #atlas-bar-hostname {
      font-size: 12px; font-weight: 500;
      color: rgba(255,255,255,0.75); letter-spacing: -0.01em;
      flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #atlas-bar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .atlas-btn {
      display: inline-flex; align-items: center; height: 28px; padding: 0 12px;
      border-radius: 7px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.80);
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      font-size: 11.5px; font-weight: 600; letter-spacing: 0.01em;
      cursor: pointer; white-space: nowrap;
      transition: background 130ms ease, border-color 130ms ease, transform 80ms ease;
      -webkit-user-select: none; user-select: none;
    }
    .atlas-btn:hover  { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.22); }
    .atlas-btn:active { transform: scale(0.94); }
    .atlas-btn-primary {
      background: rgba(0,122,255,0.88); border-color: transparent; color: #fff;
    }
    .atlas-btn-primary:hover { background: rgba(0,122,255,1); }
    .atlas-btn-stop {
      background: rgba(255,59,48,0.10); border-color: rgba(255,59,48,0.22);
      color: rgba(255,69,58,0.90);
    }
    .atlas-btn-stop:hover { background: rgba(255,59,48,0.20); border-color: rgba(255,59,48,0.40); }

    /* ── Stroke highlight ────────────────────────────────────────────────── */
    #atlas-stroke-host {
      position: fixed; inset: 0; pointer-events: none; z-index: 2147483641; overflow: visible;
    }
    .atlas-stroke-rect {
      position: absolute; border-radius: 6px;
      border: 2px solid rgba(0,122,255,0.85);
      box-shadow: 0 0 0 3px rgba(0,122,255,0.18), inset 0 0 0 1px rgba(0,122,255,0.12);
      animation:
        _atlas-stroke-in    0.3s cubic-bezier(0.16,1,0.3,1) both,
        _atlas-stroke-pulse 2s  ease-in-out 0.3s infinite;
      pointer-events: none;
    }
    @keyframes _atlas-stroke-in {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1);    }
    }
    @keyframes _atlas-stroke-pulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(0,122,255,0.18), inset 0 0 0 1px rgba(0,122,255,0.12); }
      50%     { box-shadow: 0 0 0 6px rgba(0,122,255,0.08), inset 0 0 0 1px rgba(0,122,255,0.08); }
    }
    .atlas-stroke-rect.atlas-out {
      animation: none; opacity: 0; transition: opacity 0.25s ease;
    }
  `;
  document.head.appendChild(style);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD DOM
  // ═══════════════════════════════════════════════════════════════════════════
  const html = document.documentElement;

  // 1 — Dim overlay
  const dim = document.createElement('div');
  dim.id = 'atlas-dim';
  html.appendChild(dim);
  requestAnimationFrame(() => dim.classList.add('atlas-in'));

  // 2 — White dot grid
  const dots = document.createElement('div');
  dots.id = 'atlas-dots';
  html.appendChild(dots);
  requestAnimationFrame(() => dots.classList.add('atlas-in'));

  // 3 — Arrow cursor
  const cursor = document.createElement('div');
  cursor.id = 'atlas-cursor';
  // Classic system pointer — white fill, thin black outline
  cursor.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 2.5 L19.5 11.5 L13 13.5 L10 21 Z"
      fill="white" stroke="rgba(0,0,0,0.50)" stroke-width="1.2"
      stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M13 13.5 L16.5 19.5"
      fill="none" stroke="white" stroke-width="2.8"
      stroke-linecap="round"/>
    <path d="M13 13.5 L16.5 19.5"
      fill="none" stroke="rgba(0,0,0,0.40)" stroke-width="4"
      stroke-linecap="round"/>
  </svg>`;
  html.appendChild(cursor);

  // 4 — Label capsule
  const labelEl = document.createElement('div');
  labelEl.id = 'atlas-label';
  html.appendChild(labelEl);

  // 5 — Floating 2-row card bar
  const bar = document.createElement('div');
  bar.id = 'atlas-bar';

  // Row 1: status
  const row1 = document.createElement('div');
  row1.id = 'atlas-bar-row1';
  const statusDot = document.createElement('span');
  statusDot.id = 'atlas-bar-dot';
  const statusText = document.createElement('span');
  statusText.id = 'atlas-bar-status';
  statusText.textContent = 'Logged in · Agent is using your accounts';
  row1.append(statusDot, statusText);

  // Row 2: site + buttons
  const row2 = document.createElement('div');
  row2.id = 'atlas-bar-row2';
  const faviconEl = document.createElement('img');
  faviconEl.id = 'atlas-bar-favicon';
  const hn = location.hostname.replace(/^www\./, '');
  faviconEl.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hn)}&sz=32`;
  faviconEl.onerror = () => { faviconEl.style.display = 'none'; };
  const hostnameEl = document.createElement('span');
  hostnameEl.id = 'atlas-bar-hostname';
  hostnameEl.textContent = hn;
  const actionsDiv = document.createElement('div');
  actionsDiv.id = 'atlas-bar-actions';
  const takeCtrlBtn = document.createElement('button');
  takeCtrlBtn.className = 'atlas-btn atlas-btn-primary';
  takeCtrlBtn.textContent = 'Take control';
  const stopBtn = document.createElement('button');
  stopBtn.className = 'atlas-btn atlas-btn-stop';
  stopBtn.textContent = 'Stop';
  actionsDiv.append(takeCtrlBtn, stopBtn);
  row2.append(faviconEl, hostnameEl, actionsDiv);

  bar.append(row1, row2);
  document.body.appendChild(bar);
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('atlas-in')));

  // 6 — Stroke host
  const strokeHost = document.createElement('div');
  strokeHost.id = 'atlas-stroke-host';
  html.appendChild(strokeHost);
  let _strokeEl = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  let curX        = window.innerWidth / 2;
  let curY        = window.innerHeight / 2;
  let cursorShown = false;
  let paused      = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  function moveCursor(x, y) {
    curX = x; curY = y;
    cursor.style.left = x + 'px';
    cursor.style.top  = y + 'px';
    // Label: 28px right, -10px up from cursor tip
    const lx = Math.min(x + 28, window.innerWidth  - (labelEl.offsetWidth  || 120) - 12);
    const ly = Math.max(y - 10, 8);
    labelEl.style.left = Math.max(8, lx) + 'px';
    labelEl.style.top  = ly + 'px';
    if (!cursorShown && !paused) {
      cursorShown = true;
      cursor.classList.add('atlas-visible');
      labelEl.classList.add('atlas-visible');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LABEL TEXT (cross-fade)
  // ═══════════════════════════════════════════════════════════════════════════
  function setLabelText(text) {
    if (labelEl.textContent === text) return;
    labelEl.style.transition = 'opacity 0.12s ease';
    labelEl.style.opacity = '0';
    setTimeout(() => {
      labelEl.textContent = text;
      labelEl.style.opacity = '';
      labelEl.style.transition = '';
    }, 130);
  }

  function statusToLabel(text) {
    return text
      .replace(/Navigate\s*→\s*.+$/i, 'Navigating')
      .replace(/…$|\.{3}$/, '')
      .replace(/\.$/, '')
      .trim() || text;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLICK RIPPLE
  // ═══════════════════════════════════════════════════════════════════════════
  function spawnRipple(x, y) {
    [false, true].forEach((outer) => {
      const r = document.createElement('div');
      r.className = 'atlas-ripple' + (outer ? ' atlas-ripple-outer' : '');
      r.style.left = x + 'px';
      r.style.top  = y + 'px';
      html.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
    cursor.classList.add('atlas-click');
    setTimeout(() => cursor.classList.remove('atlas-click'), 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STROKE HIGHLIGHT
  // ═══════════════════════════════════════════════════════════════════════════
  function showStroke(rect) {
    if (_strokeEl) {
      _strokeEl.classList.add('atlas-out');
      const old = _strokeEl;
      setTimeout(() => old.remove(), 280);
      _strokeEl = null;
    }
    if (!rect) return;
    const el = document.createElement('div');
    el.className = 'atlas-stroke-rect';
    el.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;
    strokeHost.appendChild(el);
    _strokeEl = el;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BAR INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  takeCtrlBtn.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      takeCtrlBtn.textContent = 'Resume';
      takeCtrlBtn.classList.remove('atlas-btn-primary');
      statusDot.classList.add('paused');
      statusText.textContent = 'Paused — you have control';
      dim.classList.add('paused');
      dots.classList.remove('atlas-in');
      cursor.classList.remove('atlas-visible');
      labelEl.classList.remove('atlas-visible');
      cursorShown = false;
      showStroke(null);
    } else {
      takeCtrlBtn.textContent = 'Take control';
      takeCtrlBtn.classList.add('atlas-btn-primary');
      statusDot.classList.remove('paused');
      statusText.textContent = 'Logged in · Agent is using your accounts';
      dim.classList.remove('paused');
      dots.classList.add('atlas-in');
    }
    chrome.runtime.sendMessage({ type: 'ATLAS_CONTROL', action: paused ? 'pause' : 'resume' });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ATLAS_CONTROL', action: 'stop' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEARDOWN
  // ═══════════════════════════════════════════════════════════════════════════
  function teardown() {
    cursor.classList.remove('atlas-visible');
    labelEl.classList.remove('atlas-visible');
    showStroke(null);

    dim.classList.remove('atlas-in');
    dim.classList.add('atlas-out');
    dots.classList.remove('atlas-in');
    dots.classList.add('atlas-out');
    bar.classList.add('atlas-out');

    setTimeout(() => {
      [dim, dots, cursor, labelEl, bar, strokeHost, root, style].forEach(el => el.remove());
    }, 560);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE HANDLER
  // ═══════════════════════════════════════════════════════════════════════════
  function onMessage(msg) {
    if (!msg || typeof msg.type !== 'string') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch (msg.type) {
      case 'ATLAS_OVERLAY_STOP':
        teardown();
        chrome.runtime.onMessage.removeListener(onMessage);
        break;

      case 'ATLAS_CURSOR': {
        const px = (msg.x != null && msg.x <= 1) ? msg.x * vw : (msg.x ?? vw / 2);
        const py = (msg.y != null && msg.y <= 1) ? msg.y * vh : (msg.y ?? vh / 2);
        moveCursor(px, py);
        break;
      }

      case 'ATLAS_STATUS_UPDATE': {
        const text = (msg.text || '').trim();
        if (!text) break;
        setLabelText(statusToLabel(text));
        // Update row-1 status text while agent is running
        if (!paused) statusText.textContent = 'Logged in · Agent is using your accounts';
        break;
      }

      case 'ATLAS_CLICK': {
        const px = (msg.x != null && msg.x <= 1) ? msg.x * vw : (msg.x ?? curX);
        const py = (msg.y != null && msg.y <= 1) ? msg.y * vh : (msg.y ?? curY);
        spawnRipple(px, py);
        break;
      }

      case 'ATLAS_HIGHLIGHT':
        showStroke(msg.rect || null);
        break;

      case 'ATLAS_SITE_INFO': {
        // Update favicon + hostname when panel sends site info
        if (msg.url) {
          try {
            const u = new URL(msg.url);
            const h = u.hostname.replace(/^www\./, '');
            hostnameEl.textContent = h;
            faviconEl.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=32`;
          } catch {}
        }
        break;
      }
    }
  }

  chrome.runtime.onMessage.addListener(onMessage);
})();
