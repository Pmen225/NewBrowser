export const SHORTCUTS_STORAGE_KEY = "ui.shortcuts";
export const MAX_SHORTCUTS = 40;

function createShortcutId() {
  return `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoString(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return new Date().toISOString();
}

export function normalizeShortcutTrigger(trigger) {
  if (typeof trigger !== "string") {
    return "";
  }

  const normalized = trigger
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  return normalized ? `/${normalized}` : "";
}

function compareShortcuts(left, right) {
  if (left.pinned !== right.pinned) {
    return left.pinned ? -1 : 1;
  }

  const leftLastUsed = left.lastUsedAt || "";
  const rightLastUsed = right.lastUsedAt || "";
  if (leftLastUsed !== rightLastUsed) {
    return rightLastUsed.localeCompare(leftLastUsed);
  }

  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return left.trigger.localeCompare(right.trigger);
}

export function normalizeShortcuts(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const trigger = normalizeShortcutTrigger(entry.trigger);
    const instructions = typeof entry.instructions === "string" ? entry.instructions.trim() : "";
    if (!trigger || !instructions) {
      continue;
    }

    if (seen.has(trigger)) {
      continue;
    }
    seen.add(trigger);

    normalized.push({
      id: typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id.trim() : createShortcutId(),
      trigger,
      label: typeof entry.label === "string" && entry.label.trim().length > 0 ? entry.label.trim() : trigger.slice(1),
      instructions,
      scope: entry.scope === "workspace" || entry.scope === "page" ? entry.scope : "global",
      pinned: entry.pinned === true,
      isBuiltIn: false,
      createdAt: toIsoString(entry.createdAt),
      updatedAt: toIsoString(entry.updatedAt),
      lastUsedAt: typeof entry.lastUsedAt === "string" && entry.lastUsedAt.trim().length > 0 ? entry.lastUsedAt.trim() : undefined
    });
  }

  return normalized.sort(compareShortcuts).slice(0, MAX_SHORTCUTS);
}

export function upsertShortcut(existing, draft, options = {}) {
  const shortcuts = normalizeShortcuts(existing);
  const trigger = normalizeShortcutTrigger(draft?.trigger);
  const instructions = typeof draft?.instructions === "string" ? draft.instructions.trim() : "";
  if (!trigger || !instructions) {
    return shortcuts;
  }

  const now = toIsoString(options.now);
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : createShortcutId;
  const incomingId = typeof draft?.id === "string" && draft.id.trim().length > 0 ? draft.id.trim() : undefined;
  const existingMatch = shortcuts.find((entry) => entry.id === incomingId || entry.trigger === trigger);

  const next = shortcuts
    .filter((entry) => entry.id !== existingMatch?.id && entry.trigger !== trigger)
    .concat([
      {
        id: existingMatch?.id || incomingId || idFactory(),
        trigger,
        label: typeof draft?.label === "string" && draft.label.trim().length > 0 ? draft.label.trim() : trigger.slice(1),
        instructions,
        scope: draft?.scope === "workspace" || draft?.scope === "page" ? draft.scope : existingMatch?.scope || "global",
        pinned: draft?.pinned === true,
        isBuiltIn: false,
        createdAt: existingMatch?.createdAt || now,
        updatedAt: now,
        lastUsedAt: existingMatch?.lastUsedAt
      }
    ]);

  return normalizeShortcuts(next);
}

export function deleteShortcut(existing, id) {
  return normalizeShortcuts(existing).filter((entry) => entry.id !== id);
}

export function touchShortcut(existing, id, now = new Date().toISOString()) {
  return normalizeShortcuts(existing).map((entry) => (
    entry.id === id ? { ...entry, lastUsedAt: now, updatedAt: now } : entry
  )).sort(compareShortcuts);
}

export function listMatchingShortcuts(existing, token = "") {
  const shortcuts = normalizeShortcuts(existing);
  const normalizedToken = token.trim().replace(/^\/+/, "").toLowerCase();
  if (!normalizedToken) {
    return shortcuts;
  }

  return shortcuts.filter((entry) => (
    entry.trigger.slice(1).startsWith(normalizedToken) ||
    entry.label.toLowerCase().includes(normalizedToken)
  ));
}
