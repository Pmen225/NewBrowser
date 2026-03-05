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
    @font-face {
      font-family: "pplxSans";
      src: url("https://r2cdn.perplexity.ai/fonts/PPLX-Sans-Beta-v1-VF.woff2") format("woff2");
      font-weight: 100 900;
      font-display: swap;
    }
    @font-face {
      font-family: "FKGroteskNeue";
      src: url("https://r2cdn.perplexity.ai/fonts/FKGroteskNeue.woff2") format("woff2");
      font-weight: 100 900;
      font-display: swap;
    }

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
      background-image: radial-gradient(circle, rgba(255,255,255,0.52) 1px, transparent 0);
      background-size: 20px 20px;
      -webkit-mask-image: radial-gradient(ellipse 70% 78% at 50% 52%, black 24%, transparent 74%);
              mask-image: radial-gradient(ellipse 70% 78% at 50% 52%, black 24%, transparent 74%);
      opacity: 0;
      animation: _atlas-dots-drift 9s linear infinite, _atlas-dots-breathe 2.8s ease-in-out infinite;
      transition: opacity 0.7s ease 0.2s;
    }
    #atlas-dots::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.18), transparent 62%);
      animation: _atlas-dots-sweep 4.2s cubic-bezier(0.16,1,0.3,1) infinite;
      mix-blend-mode: screen;
    }
    #atlas-dots.atlas-in  { opacity: 1; }
    #atlas-dots.atlas-out { opacity: 0; transition: opacity 0.3s ease; }
    @keyframes _atlas-dots-drift {
      0% { background-position: 0 0; }
      100% { background-position: 20px 20px; }
    }
    @keyframes _atlas-dots-breathe {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.1); }
    }
    @keyframes _atlas-dots-sweep {
      0%, 100% { transform: translateX(-6%); opacity: .48; }
      50% { transform: translateX(6%); opacity: .72; }
    }

    /* ── Arrow cursor ────────────────────────────────────────────────────── */
    #atlas-cursor {
      position: fixed;
      width: 26px; height: 26px;
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
      width: 26px; height: 26px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.62)) drop-shadow(0 8px 14px rgba(0,0,0,0.24));
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
      font-family: "pplxSans", "FKGroteskNeue", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
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
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      width: 364px;
      z-index: 2147483648;
      background: rgba(20,20,28,0.93);
      backdrop-filter: blur(32px) saturate(1.8);
      -webkit-backdrop-filter: blur(32px) saturate(1.8);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.09);
      box-shadow:
        0 0 0 1px rgba(0,122,255,0.35),
        0 0 20px 6px rgba(0,122,255,0.16),
        0 8px 32px rgba(0,0,0,0.48);
      font-family: "pplxSans", "FKGroteskNeue", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
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

    #atlas-bar-progress {
      height: 2px;
      margin: 0 14px;
      border-radius: 999px;
      background: rgba(255,255,255,0.1);
      overflow: hidden;
    }
    #atlas-bar-progress-fill {
      height: 100%;
      width: 22%;
      background: linear-gradient(90deg, rgba(39,196,255,0.9), rgba(0,122,255,1));
      border-radius: inherit;
      transition: width 220ms cubic-bezier(0.16,1,0.3,1);
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
      display: inline-flex; align-items: center; justify-content: center; height: 30px; min-width: 84px; padding: 0 13px;
      border-radius: 8px; border: 1px solid rgba(255,255,255,0.13);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.80);
      font-family: "pplxSans", "FKGroteskNeue", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      font-size: 11px; font-weight: 620; letter-spacing: 0.005em;
      cursor: pointer; white-space: nowrap;
      transition: background 130ms ease, border-color 130ms ease, transform 80ms ease;
      -webkit-user-select: none; user-select: none;
    }
    .atlas-btn:hover  { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.22); }
    .atlas-btn:active { transform: scale(0.96); }
    .atlas-btn:disabled { opacity: .42; cursor: not-allowed; transform: none; }
    .atlas-btn-primary {
      background: linear-gradient(180deg, rgba(41,140,255,1), rgba(0,108,255,0.92));
      border-color: rgba(107,178,255,0.45);
      color: #fff;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.28);
    }
    .atlas-btn-primary:hover { background: linear-gradient(180deg, rgba(48,148,255,1), rgba(7,116,255,0.95)); }
    .atlas-btn-stop {
      background: rgba(255,64,53,0.16);
      border-color: rgba(255,86,76,0.38);
      color: rgba(255,109,102,1);
    }
    .atlas-btn-stop:hover { background: rgba(255,64,53,0.24); border-color: rgba(255,114,106,0.52); }

    @media (prefers-color-scheme: light) {
      #atlas-bar {
        background: rgba(252,252,255,0.86);
        border: 1px solid rgba(12,24,42,0.14);
        box-shadow: 0 8px 24px rgba(16,30,52,0.18);
      }
      #atlas-bar-status { color: rgba(12,24,42,0.74); }
      #atlas-bar-hostname { color: rgba(12,24,42,0.82); }
      .atlas-btn { color: rgba(12,24,42,0.82); background: rgba(19,36,58,0.07); border-color: rgba(12,24,42,0.18); }
      .atlas-btn-stop { color: rgba(211,62,54,0.92); background: rgba(214,71,63,0.12); border-color: rgba(214,71,63,0.3); }
    }

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

    @media (prefers-reduced-motion: reduce) {
      #atlas-dim, #atlas-dots, #atlas-cursor, #atlas-bar, #atlas-label, .atlas-ripple, .atlas-stroke-rect, #atlas-bar-progress-fill {
        transition-duration: 1ms !important;
        animation-duration: 1ms !important;
      }
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
  cursor.innerHTML = `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2.4 L20.8 12.4 L13.3 14.1 L10.8 22.8 Z"
      fill="#fff" stroke="rgba(0,0,0,0.58)" stroke-width="1.08"
      stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M13.1 14.1 L17.7 21"
      fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1.6"
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

  const progress = document.createElement('div');
  progress.id = 'atlas-bar-progress';
  const progressFill = document.createElement('div');
  progressFill.id = 'atlas-bar-progress-fill';
  progress.appendChild(progressFill);

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

  bar.append(row1, progress, row2);
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

  function emitControl(action) {
    try {
      chrome.runtime.sendMessage({ type: 'ATLAS_CONTROL', action });
    } catch {}
  }

  function applyStoppingState() {
    takeCtrlBtn.textContent = 'Take control';
    takeCtrlBtn.classList.remove('atlas-btn-primary');
    takeCtrlBtn.disabled = true;
    stopBtn.disabled = true;
    statusDot.classList.add('paused');
    statusText.textContent = 'Stopping agent…';
    progressFill.style.width = '8%';
    dim.classList.add('paused');
    dots.classList.remove('atlas-in');
    cursor.classList.remove('atlas-visible');
    labelEl.classList.remove('atlas-visible');
    cursorShown = false;
    showStroke(null);
  }

  function applyControlState(isPaused) {
    paused = isPaused;
    if (isPaused) {
      takeCtrlBtn.textContent = 'Resume';
      takeCtrlBtn.classList.remove('atlas-btn-primary');
      statusDot.classList.add('paused');
      statusText.textContent = 'Paused — you have control';
      progressFill.style.width = '8%';
      dim.classList.add('paused');
      dots.classList.remove('atlas-in');
      cursor.classList.remove('atlas-visible');
      labelEl.classList.remove('atlas-visible');
      cursorShown = false;
      takeCtrlBtn.disabled = false;
      stopBtn.disabled = false;
      showStroke(null);
      return;
    }
    takeCtrlBtn.textContent = 'Take control';
    takeCtrlBtn.classList.add('atlas-btn-primary');
    statusDot.classList.remove('paused');
    statusText.textContent = 'Logged in · Agent is using your accounts';
    progressFill.style.width = '24%';
    dim.classList.remove('paused');
    dots.classList.add('atlas-in');
    takeCtrlBtn.disabled = false;
    stopBtn.disabled = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BAR INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  takeCtrlBtn.addEventListener('click', () => {
    const nextPaused = !paused;
    applyControlState(nextPaused);
    emitControl(nextPaused ? 'pause' : 'resume');
  });

  stopBtn.addEventListener('click', () => {
    applyStoppingState();
    emitControl('stop');
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
  function setStatusFromMessage(msg) {
    const text = (msg?.text || msg?.statusText || '').trim();
    const phase = String(msg?.phase || '').toLowerCase();
    const phaseLabel = ({ thinking: 'Thinking', planning: 'Planning', navigating: 'Navigating', typing: 'Typing', verifying: 'Verifying' })[phase] || 'Agent';
    if (text) {
      statusText.textContent = `${phaseLabel} · ${text}`;
      setLabelText(text);
    } else {
      statusText.textContent = 'Agent is working';
    }
    const rawProgress = Number.isFinite(msg?.progress) ? Number(msg.progress) : NaN;
    const progressPct = Number.isFinite(rawProgress) ? Math.max(8, Math.min(100, rawProgress)) : 22;
    progressFill.style.width = `${progressPct}%`;
  }

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
        if (!paused) setStatusFromMessage(msg);
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
