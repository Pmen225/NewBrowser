export const OVERLAY_NONE = "none";

const VALID_OVERLAYS = new Set([
  OVERLAY_NONE,
  "slash",
  "at",
  "plus",
  "model",
  "recents",
  "shortcutEditor"
]);

export function normalizeOverlayKind(value) {
  return typeof value === "string" && VALID_OVERLAYS.has(value) ? value : OVERLAY_NONE;
}

export function closeOverlay(_current) {
  return OVERLAY_NONE;
}

export function toggleOverlay(current, next) {
  const currentKind = normalizeOverlayKind(current);
  const nextKind = normalizeOverlayKind(next);
  if (nextKind === OVERLAY_NONE) {
    return OVERLAY_NONE;
  }
  return currentKind === nextKind ? OVERLAY_NONE : nextKind;
}
