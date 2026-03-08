(function () {
  "use strict";

  if (document.getElementById("atlas-agent-overlay-root")) {
    return;
  }

  const PHASE_LABELS = {
    thinking: "Thinking",
    planning: "Planning",
    navigating: "Navigating",
    reading: "Reading",
    extracting: "Extracting",
    typing: "Typing",
    verifying: "Verifying",
  };
  const CONTROLLED_TAB_TITLE_PREFIX = "AI · ";
  const CONTROL_STATUS_TEXT = {
    active: "Browser control active",
    paused: "Paused — you have control",
    pausing: "Pausing…",
    stopping: "Stopping agent",
  };

  const root = document.createElement("div");
  root.id = "atlas-agent-overlay-root";
  document.documentElement.appendChild(root);

  const style = document.createElement("style");
  style.id = "atlas-agent-overlay-style";
  style.textContent = `
    #atlas-agent-overlay-root {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483634;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    }
    #atlas-agent-overlay-root * {
      box-sizing: border-box;
    }
    .atlas-layer {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.48s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }
    .atlas-layer.atlas-in {
      opacity: 1;
    }
    .atlas-layer.atlas-out {
      opacity: 0;
      transition-duration: 0.28s;
    }

    #atlas-desat {
      background: rgba(116, 124, 142, 0.78);
      mix-blend-mode: saturation;
    }

    #atlas-dim {
      background:
        radial-gradient(circle at center, rgba(13, 15, 23, 0.04), rgba(13, 15, 23, 0.2)),
        rgba(10, 12, 18, 0.18);
    }
    #atlas-dim.atlas-paused {
      background: rgba(10, 12, 18, 0.08);
    }

    #atlas-glow {
      background:
        radial-gradient(ellipse 64% 48% at 100% 0%, oklch(55.25% 0.085 207.66 / 0.22) 0%, transparent 72%),
        radial-gradient(ellipse 60% 46% at 0% 0%, oklch(55.25% 0.085 207.66 / 0.18) 0%, transparent 68%),
        radial-gradient(ellipse 60% 46% at 100% 100%, oklch(55.25% 0.085 207.66 / 0.16) 0%, transparent 68%),
        radial-gradient(ellipse 56% 44% at 0% 100%, oklch(55.25% 0.085 207.66 / 0.13) 0%, transparent 64%);
    }
    #atlas-glow.atlas-in {
      animation: atlas-glow-breathe 5.4s ease-in-out infinite;
    }
    @keyframes atlas-glow-breathe {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.1); }
    }

    #atlas-dots {
      background-image: radial-gradient(circle, rgba(255, 255, 255, 0.48) 1px, transparent 0);
      background-size: 20px 20px;
      -webkit-mask-image: radial-gradient(ellipse 76% 82% at 50% 52%, black 22%, transparent 74%);
      mask-image: radial-gradient(ellipse 76% 82% at 50% 52%, black 22%, transparent 74%);
      transition-delay: 100ms;
    }
    #atlas-dots::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.2) 48%, transparent 100%),
        radial-gradient(circle at center, rgba(255, 255, 255, 0.14), transparent 62%);
      mix-blend-mode: screen;
      animation: atlas-dots-sweep 4.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    #atlas-dots.atlas-in {
      animation: atlas-dots-breathe 3.1s ease-in-out infinite;
    }
    @keyframes atlas-dots-breathe {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.78; }
    }
    @keyframes atlas-dots-sweep {
      0%, 100% { transform: translateX(-6%); opacity: 0.32; }
      50% { transform: translateX(6%); opacity: 0.7; }
    }

    #atlas-stroke-host {
      position: absolute;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }
    .atlas-stroke-rect {
      position: absolute;
      border-radius: 8px;
      border: 2px solid rgba(0, 122, 255, 0.88);
      box-shadow:
        0 0 0 3px rgba(0, 122, 255, 0.2),
        0 0 24px rgba(0, 122, 255, 0.12);
      animation:
        atlas-stroke-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both,
        atlas-stroke-pulse 1.9s ease-in-out infinite 220ms;
    }
    .atlas-stroke-rect.atlas-out {
      animation: none;
      opacity: 0;
      transition: opacity 180ms ease;
    }
    @keyframes atlas-stroke-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes atlas-stroke-pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2), 0 0 24px rgba(0, 122, 255, 0.12); }
      50% { box-shadow: 0 0 0 7px rgba(0, 122, 255, 0.08), 0 0 28px rgba(0, 122, 255, 0.18); }
    }

    .atlas-ripple {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 1.5px solid rgba(0, 122, 255, 0.74);
      transform: translate(-50%, -50%) scale(0);
      animation: atlas-ripple 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .atlas-ripple.atlas-ripple-outer {
      border-color: rgba(0, 122, 255, 0.28);
      animation-duration: 760ms;
      animation-delay: 40ms;
    }
    @keyframes atlas-ripple {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(4); }
    }

    #atlas-cursor {
      position: absolute;
      top: 0;
      left: 0;
      width: 22px;
      height: 22px;
      opacity: 0;
      transform: translate3d(0, 0, 0);
      transition:
        transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
        opacity 180ms ease;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.62)) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
    }
    #atlas-cursor.atlas-visible {
      opacity: 1;
    }
    #atlas-cursor.atlas-click svg {
      transform: scale(0.78);
    }
    #atlas-cursor svg {
      width: 100%;
      height: 100%;
      transition: transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    #atlas-label {
      position: absolute;
      top: 0;
      left: 0;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(12, 14, 20, 0.84);
      color: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px) saturate(1.55);
      -webkit-backdrop-filter: blur(16px) saturate(1.55);
      font-size: 11.5px;
      font-weight: 520;
      letter-spacing: -0.01em;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(4px);
      transition:
        opacity 180ms ease,
        transform 180ms ease,
        left 520ms cubic-bezier(0.16, 1, 0.3, 1),
        top 520ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    #atlas-label.atlas-visible {
      opacity: 1;
      transform: translateY(0);
    }

    #atlas-bar {
      position: absolute;
      left: 50%;
      bottom: 22px;
      width: min(clamp(240px, 22vw, 340px), calc(100vw - 24px));
      transform: translateX(-50%) translateY(18px);
      border-radius: 14px;
      background: rgba(20, 22, 30, 0.84);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 0 0 1px rgba(0, 122, 255, 0.22),
        0 14px 36px rgba(0, 0, 0, 0.45),
        0 0 30px rgba(0, 122, 255, 0.12);
      backdrop-filter: blur(24px) saturate(1.45);
      -webkit-backdrop-filter: blur(24px) saturate(1.45);
      overflow: hidden;
      pointer-events: auto;
      opacity: 0;
      transition:
        opacity 420ms cubic-bezier(0.16, 1, 0.3, 1),
        transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    #atlas-bar.atlas-in {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    #atlas-bar.atlas-out {
      opacity: 0;
      transform: translateX(-50%) translateY(14px);
      transition-duration: 240ms;
    }
    #atlas-bar-row1,
    #atlas-bar-row2 {
      display: flex;
      align-items: center;
    }
    #atlas-bar-row1 {
      gap: 10px;
      padding: 10px 12px;
    }
    #atlas-bar-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #34c759;
      flex-shrink: 0;
      animation: atlas-live-dot 2.1s ease-in-out infinite;
    }
    #atlas-bar-dot.paused {
      background: #ff9f0a;
      animation: none;
    }
    @keyframes atlas-live-dot {
      0%, 100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.48); }
      55% { box-shadow: 0 0 0 5px rgba(52, 199, 89, 0); }
    }
    #atlas-bar-status {
      flex: 1;
      font-size: 11.5px;
      font-weight: 520;
      color: rgba(255, 255, 255, 0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity 140ms ease;
    }
    #atlas-bar-status.atlas-fade {
      opacity: 0;
    }
    #atlas-bar-row2 {
      gap: 10px;
      padding: 9px 11px 11px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    #atlas-bar-favicon {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      flex-shrink: 0;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.08);
    }
    #atlas-bar-hostname {
      flex: 1;
      font-size: 12px;
      font-weight: 560;
      color: rgba(255, 255, 255, 0.82);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #atlas-bar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .atlas-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
      height: 28px;
      padding: 0 12px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.84);
      font: inherit;
      font-size: 10.5px;
      font-weight: 620;
      cursor: pointer;
      transition:
        background 120ms ease,
        border-color 120ms ease,
        transform 90ms ease,
        opacity 120ms ease;
    }
    .atlas-btn:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .atlas-btn:active {
      transform: scale(0.96);
    }
    .atlas-btn:disabled {
      opacity: 0.45;
      cursor: default;
      transform: none;
    }
    .atlas-btn-primary {
      color: #fff;
      border-color: rgba(107, 178, 255, 0.44);
      background: linear-gradient(180deg, rgba(41, 140, 255, 1), rgba(0, 108, 255, 0.92));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
    }
    .atlas-btn-primary:hover {
      background: linear-gradient(180deg, rgba(48, 148, 255, 1), rgba(7, 116, 255, 0.95));
    }
    .atlas-btn-stop {
      color: rgba(255, 118, 111, 1);
      border-color: rgba(255, 86, 76, 0.34);
      background: rgba(255, 64, 53, 0.14);
    }
    .atlas-btn-stop:hover {
      background: rgba(255, 64, 53, 0.2);
      border-color: rgba(255, 114, 106, 0.48);
    }

    @media (prefers-color-scheme: light) {
      #atlas-bar {
        background: rgba(252, 252, 255, 0.88);
        border-color: rgba(12, 24, 42, 0.14);
        box-shadow:
          0 0 0 1px rgba(12, 24, 42, 0.06),
          0 14px 32px rgba(16, 30, 52, 0.16),
          0 0 24px rgba(0, 122, 255, 0.08);
      }
      #atlas-bar-status {
        color: rgba(12, 24, 42, 0.7);
      }
      #atlas-bar-hostname {
        color: rgba(12, 24, 42, 0.82);
      }
      .atlas-btn {
        color: rgba(12, 24, 42, 0.82);
        background: rgba(19, 36, 58, 0.06);
        border-color: rgba(12, 24, 42, 0.16);
      }
      .atlas-btn-stop {
        color: rgba(211, 62, 54, 0.92);
        background: rgba(214, 71, 63, 0.1);
        border-color: rgba(214, 71, 63, 0.26);
      }
      #atlas-label {
        background: rgba(248, 250, 255, 0.9);
        color: rgba(12, 24, 42, 0.86);
        border-color: rgba(12, 24, 42, 0.08);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .atlas-layer,
      #atlas-cursor,
      #atlas-label,
      #atlas-bar,
      .atlas-stroke-rect,
      .atlas-ripple,
      #atlas-bar-status {
        transition-duration: 1ms !important;
        animation-duration: 1ms !important;
      }
    }
  `;
  document.head.appendChild(style);

  function createLayer(id, className) {
    const element = document.createElement("div");
    element.id = id;
    element.className = className ? `atlas-layer ${className}` : "atlas-layer";
    root.appendChild(element);
    return element;
  }

  const desat = createLayer("atlas-desat");
  const dim = createLayer("atlas-dim");
  const glow = createLayer("atlas-glow");
  const dots = createLayer("atlas-dots");

  const strokeHost = document.createElement("div");
  strokeHost.id = "atlas-stroke-host";
  root.appendChild(strokeHost);

  const cursor = document.createElement("div");
  cursor.id = "atlas-cursor";
  cursor.innerHTML = `
    <svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 2.4 L20.8 12.4 L13.3 14.1 L10.8 22.8 Z"
        fill="#ffffff"
        stroke="rgba(0,0,0,0.58)"
        stroke-width="1.08"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <path
        d="M13.1 14.1 L17.7 21"
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>
  `;
  root.appendChild(cursor);

  const labelEl = document.createElement("div");
  labelEl.id = "atlas-label";
  labelEl.textContent = "Working…";
  root.appendChild(labelEl);

  const bar = document.createElement("div");
  bar.id = "atlas-bar";
  bar.innerHTML = `
    <div id="atlas-bar-row1">
      <span id="atlas-bar-dot"></span>
      <span id="atlas-bar-status">Browser control active</span>
    </div>
    <div id="atlas-bar-row2">
      <img id="atlas-bar-favicon" alt="" />
      <span id="atlas-bar-hostname"></span>
      <div id="atlas-bar-actions">
        <button id="atlas-take-control" class="atlas-btn atlas-btn-primary" type="button">Take control</button>
        <button id="atlas-stop" class="atlas-btn atlas-btn-stop" type="button">Stop</button>
      </div>
    </div>
  `;
  root.appendChild(bar);

  const statusDot = bar.querySelector("#atlas-bar-dot");
  const statusText = bar.querySelector("#atlas-bar-status");
  const faviconEl = bar.querySelector("#atlas-bar-favicon");
  const hostnameEl = bar.querySelector("#atlas-bar-hostname");
  const takeControlButton = bar.querySelector("#atlas-take-control");
  const stopButton = bar.querySelector("#atlas-stop");

  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let cursorVisible = false;
  let paused = false;
  let controlState = "active";
  let tearingDown = false;
  let strokeEl = null;
  let currentAnchorRect = null;
  let statusSwapTimer = null;
  let labelSwapTimer = null;
  let cursorMotionFrame = null;
  let cursorMotionEndMs = 0;
  let pendingClickTimer = null;
  let titleObserver = null;
  let syncingTitle = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizePoint(x, y) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextX = typeof x === "number" && x <= 1 ? x * viewportWidth : x;
    const nextY = typeof y === "number" && y <= 1 ? y * viewportHeight : y;
    return {
      x: clamp(Number.isFinite(nextX) ? nextX : viewportWidth / 2, 0, viewportWidth),
      y: clamp(Number.isFinite(nextY) ? nextY : viewportHeight / 2, 0, viewportHeight),
    };
  }

  function normalizeRect(rect) {
    if (!rect || typeof rect !== "object") {
      return null;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextX = typeof rect.x === "number" && rect.x <= 1 ? rect.x * viewportWidth : rect.x;
    const nextY = typeof rect.y === "number" && rect.y <= 1 ? rect.y * viewportHeight : rect.y;
    const nextW = typeof rect.w === "number" && rect.w <= 1 ? rect.w * viewportWidth : rect.w;
    const nextH = typeof rect.h === "number" && rect.h <= 1 ? rect.h * viewportHeight : rect.h;
    if (![nextX, nextY, nextW, nextH].every((value) => typeof value === "number" && Number.isFinite(value))) {
      return null;
    }
    return {
      x: clamp(nextX, 0, viewportWidth),
      y: clamp(nextY, 0, viewportHeight),
      w: clamp(nextW, 0, viewportWidth),
      h: clamp(nextH, 0, viewportHeight)
    };
  }

  function phaseLabel(phase) {
    return PHASE_LABELS[String(phase || "").toLowerCase()] || "Agent";
  }

  function stripControlledTitlePrefix(value) {
    if (typeof value !== "string") {
      return "";
    }
    const trimmed = value.trim();
    return trimmed.startsWith(CONTROLLED_TAB_TITLE_PREFIX)
      ? trimmed.slice(CONTROLLED_TAB_TITLE_PREFIX.length).trim()
      : trimmed;
  }

  function controlledTabTitleBase() {
    const currentTitle = stripControlledTitlePrefix(document.title || "");
    if (currentTitle) {
      return currentTitle;
    }
    const hostname = hostnameEl.textContent?.trim();
    return hostname || "Current page";
  }

  function syncControlledTabTitle() {
    const nextTitle = `${CONTROLLED_TAB_TITLE_PREFIX}${controlledTabTitleBase()}`;
    if (document.title === nextTitle) {
      return;
    }
    syncingTitle = true;
    document.title = nextTitle;
    syncingTitle = false;
  }

  function disconnectTitleObserver() {
    if (!titleObserver) {
      return;
    }
    titleObserver.disconnect();
    titleObserver = null;
  }

  function ensureTitleObserver() {
    if (titleObserver) {
      return;
    }
    titleObserver = new MutationObserver(() => {
      if (!syncingTitle) {
        syncControlledTabTitle();
      }
    });
    titleObserver.observe(document.head || document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  function enableControlledTabTitle() {
    ensureTitleObserver();
    syncControlledTabTitle();
  }

  function disableControlledTabTitle() {
    disconnectTitleObserver();
    const restoredTitle = stripControlledTitlePrefix(document.title || "");
    if (document.title === restoredTitle) {
      return;
    }
    syncingTitle = true;
    document.title = restoredTitle;
    syncingTitle = false;
  }

  function statusLine(message) {
    const text = String(message?.text || message?.statusText || "").trim();
    if (!text) {
      return "Agent is working";
    }
    return `${phaseLabel(message?.phase)} · ${text}`;
  }

  function shortLabel(message) {
    const text = String(message?.text || message?.statusText || "").trim();
    if (!text) {
      return "Working…";
    }
    if (/^navigate\s*→/i.test(text)) {
      const host = text
        .replace(/^navigate\s*→\s*/i, "")
        .replace(/^https?:\/\/(www\.)?/i, "")
        .split("/")[0]
        .trim();
      return host ? `Navigating · ${host}` : "Navigating";
    }
    if (/^reading page/i.test(text)) {
      return "Reading page";
    }
    if (/^extracting page text/i.test(text) || /^extracting/i.test(text)) {
      return "Extracting";
    }
    if (/^search:/i.test(text)) {
      return "Searching";
    }
    if (/^find:/i.test(text)) {
      return "Finding element";
    }
    if (/^filling form/i.test(text)) {
      return "Filling form";
    }
    return text.replace(/[.…]+$/g, "").trim() || "Working…";
  }

  function updateLabelPosition(x = currentX, y = currentY) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const labelWidth = Math.min(labelEl.offsetWidth || 140, viewportWidth - 16);
    const labelHeight = labelEl.offsetHeight || 32;
    const safe = 8;
    const gap = 12;

    let left = clamp(x + 28, safe, viewportWidth - labelWidth - safe);
    let top = clamp(y - 8, safe, viewportHeight - labelHeight - safe);

    if (currentAnchorRect) {
      const rect = currentAnchorRect;
      const centeredLeft = clamp(
        rect.x + (rect.w / 2) - (labelWidth / 2),
        safe,
        viewportWidth - labelWidth - safe
      );
      const middleTop = clamp(
        rect.y + (rect.h / 2) - (labelHeight / 2),
        safe,
        viewportHeight - labelHeight - safe
      );

      const canPlaceAbove = rect.y - labelHeight - gap >= safe;
      const canPlaceBelow = rect.y + rect.h + labelHeight + gap <= viewportHeight - safe;
      const canPlaceRight = rect.x + rect.w + labelWidth + gap <= viewportWidth - safe;
      const canPlaceLeft = rect.x - labelWidth - gap >= safe;

      if (canPlaceAbove) {
        left = centeredLeft;
        top = rect.y - labelHeight - gap;
      } else if (canPlaceBelow) {
        left = centeredLeft;
        top = rect.y + rect.h + gap;
      } else if (canPlaceRight) {
        left = rect.x + rect.w + gap;
        top = middleTop;
      } else if (canPlaceLeft) {
        left = rect.x - labelWidth - gap;
        top = middleTop;
      }
    }

    labelEl.style.left = `${left}px`;
    labelEl.style.top = `${top}px`;
  }

  function applyCursorPosition(x, y) {
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    updateLabelPosition(x, y);
  }

  function cancelCursorMotion() {
    if (cursorMotionFrame !== null) {
      cancelAnimationFrame(cursorMotionFrame);
      cursorMotionFrame = null;
    }
  }

  function clearPendingClick() {
    if (pendingClickTimer !== null) {
      clearTimeout(pendingClickTimer);
      pendingClickTimer = null;
    }
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCursorPath(targetX, targetY) {
    cancelCursorMotion();
    const startX = currentX;
    const startY = currentY;
    const deltaX = targetX - startX;
    const deltaY = targetY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 1) {
      applyCursorPosition(targetX, targetY);
      cursorMotionEndMs = Date.now();
      return;
    }

    const duration = Math.max(180, Math.min(520, 130 + distance * 0.45));
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const perpX = -unitY;
    const perpY = unitX;
    const arc = Math.min(8, Math.max(0, distance * 0.035));
    const direction = ((Math.round(startX + startY + targetX + targetY) % 2) === 0 ? 1 : -1);
    const controlX = startX + deltaX * 0.5 + perpX * arc * direction;
    const controlY = startY + deltaY * 0.5 + perpY * arc * direction;
    const startedAt = performance.now();
    cursorMotionEndMs = Date.now() + duration;

    const step = (timestamp) => {
      const rawT = Math.min(1, (timestamp - startedAt) / duration);
      const t = easeOutCubic(rawT);
      const inverse = 1 - t;
      const x = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * targetX;
      const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * targetY;
      applyCursorPosition(x, y);
      if (rawT >= 1) {
        currentX = targetX;
        currentY = targetY;
        cursorMotionFrame = null;
        applyCursorPosition(currentX, currentY);
        return;
      }
      cursorMotionFrame = requestAnimationFrame(step);
    };

    cursorMotionFrame = requestAnimationFrame(step);
  }

  function showCursor() {
    if (paused || cursorVisible) {
      return;
    }
    cursorVisible = true;
    cursor.classList.add("atlas-visible");
    labelEl.classList.add("atlas-visible");
    applyCursorPosition(currentX, currentY);
  }

  function hideCursor() {
    cursorVisible = false;
    cursor.classList.remove("atlas-visible");
    labelEl.classList.remove("atlas-visible");
    cancelCursorMotion();
    clearPendingClick();
    applyCursorPosition(currentX, currentY);
  }

  function moveCursor(x, y) {
    const point = normalizePoint(x, y);
    showCursor();
    animateCursorPath(point.x, point.y);
  }

  function swapText(element, nextText, timerName) {
    if (!element || element.textContent === nextText) {
      return;
    }
    if (timerName === "label" && labelSwapTimer) {
      clearTimeout(labelSwapTimer);
    }
    if (timerName === "status" && statusSwapTimer) {
      clearTimeout(statusSwapTimer);
    }
    element.classList.add("atlas-fade");
    const timer = setTimeout(() => {
      element.textContent = nextText;
      element.classList.remove("atlas-fade");
      updateLabelPosition();
      if (timerName === "label") {
        labelSwapTimer = null;
      } else {
        statusSwapTimer = null;
      }
    }, 120);
    if (timerName === "label") {
      labelSwapTimer = timer;
    } else {
      statusSwapTimer = timer;
    }
  }

  function showStroke(rect) {
    if (strokeEl) {
      const previousStroke = strokeEl;
      previousStroke.classList.add("atlas-out");
      setTimeout(() => previousStroke.remove(), 180);
      strokeEl = null;
    }
    const normalizedRect = normalizeRect(rect);
    currentAnchorRect = normalizedRect;
    if (!normalizedRect || paused) {
      updateLabelPosition();
      return;
    }
    const nextStroke = document.createElement("div");
    nextStroke.className = "atlas-stroke-rect";
    nextStroke.style.left = `${normalizedRect.x}px`;
    nextStroke.style.top = `${normalizedRect.y}px`;
    nextStroke.style.width = `${normalizedRect.w}px`;
    nextStroke.style.height = `${normalizedRect.h}px`;
    strokeHost.appendChild(nextStroke);
    strokeEl = nextStroke;
    updateLabelPosition();
  }

  function spawnRipple(x, y) {
    if (paused) {
      return;
    }
    const point = normalizePoint(x, y);
    clearPendingClick();
    const delay = Math.max(90, cursorMotionEndMs - Date.now() + 90);
    pendingClickTimer = setTimeout(() => {
      pendingClickTimer = null;
      currentX = point.x;
      currentY = point.y;
      applyCursorPosition(currentX, currentY);
      ["", " atlas-ripple-outer"].forEach((suffix) => {
        const ripple = document.createElement("div");
        ripple.className = `atlas-ripple${suffix}`;
        ripple.style.left = `${point.x}px`;
        ripple.style.top = `${point.y}px`;
        root.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      });
      cursor.classList.add("atlas-click");
      setTimeout(() => cursor.classList.remove("atlas-click"), 180);
    }, delay);
  }

  function setStatusFromMessage(message) {
    if (paused) {
      return;
    }
    swapText(statusText, statusLine(message), "status");
    swapText(labelEl, shortLabel(message), "label");
    showCursor();
  }

  function emitControl(action) {
    try {
      chrome.runtime.sendMessage({ type: "ATLAS_CONTROL", action });
    } catch {}
  }

  function applyControlState(nextState) {
    controlState = String(nextState || "active").toLowerCase();
    paused = controlState === "pausing" || controlState === "paused" || controlState === "stopping";

    const isActive = controlState === "active";
    const isPaused = controlState === "paused";
    const isPausing = controlState === "pausing";
    const isStopping = controlState === "stopping";

    takeControlButton.disabled = isPausing || isStopping;
    stopButton.disabled = isStopping;
    takeControlButton.textContent = isPaused ? "Resume" : "Take control";
    takeControlButton.classList.toggle("atlas-btn-primary", isActive);
    statusDot.classList.toggle("paused", !isActive);

    if (isPaused) {
      statusText.textContent = CONTROL_STATUS_TEXT.paused;
    } else if (isPausing) {
      statusText.textContent = CONTROL_STATUS_TEXT.pausing;
    } else if (isStopping) {
      statusText.textContent = CONTROL_STATUS_TEXT.stopping;
    } else {
      statusText.textContent = CONTROL_STATUS_TEXT.active;
    }

    dim.classList.toggle("atlas-paused", paused);
    if (paused) {
      dots.classList.remove("atlas-in");
      hideCursor();
      showStroke(null);
      return;
    }

    dots.classList.add("atlas-in");
    showCursor();
    enableControlledTabTitle();
  }

  function updateSiteInfo(message) {
    const fallbackHost = location.hostname.replace(/^www\./, "") || "current page";
    let hostname = fallbackHost;
    if (message?.url) {
      try {
        hostname = new URL(message.url).hostname.replace(/^www\./, "") || fallbackHost;
      } catch {}
    }
    hostnameEl.textContent = hostname;

    const favicon = typeof message?.favicon === "string" && message.favicon.trim()
      ? message.favicon
      : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
    faviconEl.src = favicon;
    faviconEl.onerror = () => {
      faviconEl.style.display = "none";
    };
    faviconEl.style.display = "";
  }

  function teardown() {
    if (tearingDown) {
      return;
    }
    tearingDown = true;
    disableControlledTabTitle();
    hideCursor();
    showStroke(null);
    [desat, dim, glow, dots].forEach((element) => {
      element.classList.remove("atlas-in");
      element.classList.add("atlas-out");
    });
    bar.classList.remove("atlas-in");
    bar.classList.add("atlas-out");
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener("resize", handleResize);
    setTimeout(() => {
      root.remove();
      style.remove();
    }, 520);
  }

  function handleResize() {
    moveCursor(currentX, currentY);
  }

  function onMessage(message) {
    if (!message || typeof message.type !== "string") {
      return;
    }

    switch (message.type) {
      case "ATLAS_OVERLAY_STOP":
        teardown();
        break;
      case "ATLAS_CURSOR":
        if (!paused) {
          moveCursor(message.x, message.y);
        }
        break;
      case "ATLAS_STATUS_UPDATE":
        setStatusFromMessage(message);
        break;
      case "ATLAS_CONTROL_STATE":
        applyControlState(message.state);
        break;
      case "ATLAS_CLICK":
        spawnRipple(message.x, message.y);
        break;
      case "ATLAS_HIGHLIGHT":
        showStroke(message.rect || null);
        break;
      case "ATLAS_SITE_INFO":
        updateSiteInfo(message);
        break;
      default:
        break;
    }
  }

  takeControlButton.addEventListener("click", () => {
    if (controlState === "active") {
      emitControl("pause");
      return;
    }
    if (controlState === "paused") {
      emitControl("resume");
    }
  });

  stopButton.addEventListener("click", () => {
    emitControl("stop");
  });

  updateSiteInfo({});
  applyControlState("active");
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener("resize", handleResize);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      [desat, dim, glow, dots].forEach((element) => element.classList.add("atlas-in"));
      bar.classList.add("atlas-in");
      moveCursor(currentX, currentY);
    });
  });
})();
