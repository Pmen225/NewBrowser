const PHASE_LABELS = {
  thinking: 'Thinking',
  planning: 'Planning',
  navigating: 'Navigating',
  typing: 'Typing',
  verifying: 'Verifying',
};

export function normalizeViewportPoint(point, viewportWidth, viewportHeight) {
  const x = point?.x ?? viewportWidth / 2;
  const y = point?.y ?? viewportHeight / 2;
  return {
    x: x <= 1 ? x * viewportWidth : x,
    y: y <= 1 ? y * viewportHeight : y,
  };
}

export function clampPointToViewport(point, viewportWidth, viewportHeight) {
  return {
    x: Math.min(Math.max(point.x, 0), viewportWidth),
    y: Math.min(Math.max(point.y, 0), viewportHeight),
  };
}

export function atlasStatusLine(message) {
  const text = (message?.text ?? message?.statusText ?? '').trim();
  const phase = (message?.phase ?? '').toLowerCase();
  const phaseLabel = PHASE_LABELS[phase] ?? 'Agent';
  if (!text) return 'Agent is working';
  return `${phaseLabel} · ${text}`;
}

export function overlayProgressValue(progress) {
  const numeric = Number(progress);
  if (!Number.isFinite(numeric)) return 22;
  return Math.max(8, Math.min(100, numeric));
}

export function controlButtonState(paused) {
  return paused
    ? { label: 'Resume', primary: false, status: 'Paused — you have control', progress: 8 }
    : { label: 'Take control', primary: true, status: 'Logged in · Agent is using your accounts', progress: 24 };
}

export function stoppingControlState() {
  return { label: 'Take control', primary: false, status: 'Stopping agent…', progress: 8 };
}

export function safeHostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'current page';
  } catch {
    return 'current page';
  }
}
