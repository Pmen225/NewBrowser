const PHASE_LABELS = {
  thinking: 'Thinking',
  planning: 'Planning',
  navigating: 'Navigating',
  reading: 'Reading',
  extracting: 'Extracting',
  typing: 'Typing',
  verifying: 'Verifying',
};

export function overlayPhaseForTool(toolName) {
  if (toolName === 'navigate') return 'navigating';
  if (toolName === 'read_page') return 'reading';
  if (toolName === 'get_page_text') return 'extracting';
  if (toolName === 'computer') return 'typing';
  if (toolName === 'find' || toolName === 'form_input') return 'verifying';
  if (toolName === 'search_web') return 'planning';
  return 'thinking';
}

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

export function controlButtonState(state) {
  const controlState =
    state === true ? 'paused' :
    state === false || state === undefined || state === null ? 'active' :
    String(state).toLowerCase();

  if (controlState === 'paused') {
    return { label: 'Resume', primary: false, status: 'Paused — you have control' };
  }
  if (controlState === 'pausing') {
    return { label: 'Take control', primary: false, status: 'Pausing…' };
  }
  if (controlState === 'stopping') {
    return { label: 'Take control', primary: false, status: 'Stopping agent' };
  }
  return { label: 'Take control', primary: true, status: 'Browser control active' };
}

export function stoppingControlState() {
  return controlButtonState('stopping');
}

export function safeHostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'current page';
  } catch {
    return 'current page';
  }
}
