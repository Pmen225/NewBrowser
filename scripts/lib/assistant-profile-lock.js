import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJsonIfChanged(filePath, value, previous) {
  const nextText = JSON.stringify(value, null, 2);
  const previousText = previous === null ? null : JSON.stringify(previous, null, 2);
  if (nextText === previousText) {
    return false;
  }
  await writeFile(filePath, `${nextText}\n`, "utf8");
  return true;
}

function matchExtensionIdFromSettings(settings, extensionPath) {
  if (!isRecord(settings)) {
    return null;
  }

  const normalizedExtensionPath = path.resolve(extensionPath);
  for (const [extensionId, entry] of Object.entries(settings)) {
    if (!isRecord(entry)) {
      continue;
    }
    const installedPath = typeof entry.path === "string" ? path.resolve(entry.path) : "";
    if (installedPath === normalizedExtensionPath) {
      return extensionId;
    }
  }

  return null;
}

export function resolveAssistantExtensionId({
  preferences,
  securePreferences,
  extensionPath,
  explicitExtensionId
}) {
  const explicit = typeof explicitExtensionId === "string" ? explicitExtensionId.trim() : "";
  if (explicit) {
    return explicit;
  }

  const fromSecure = matchExtensionIdFromSettings(securePreferences?.extensions?.settings, extensionPath);
  if (fromSecure) {
    return fromSecure;
  }

  return matchExtensionIdFromSettings(preferences?.extensions?.settings, extensionPath);
}

export function applyAssistantPreferenceLock(preferences, extensionId) {
  const nextPreferences = cloneJson(preferences);
  const extensions = isRecord(nextPreferences.extensions) ? nextPreferences.extensions : {};
  const pinnedExtensions = Array.isArray(extensions.pinned_extensions)
    ? extensions.pinned_extensions.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!pinnedExtensions.includes(extensionId)) {
    pinnedExtensions.unshift(extensionId);
  }

  nextPreferences.extensions = {
    ...extensions,
    pinned_extensions: [...new Set(pinnedExtensions)],
    ui: {
      ...(isRecord(extensions.ui) ? extensions.ui : {}),
      developer_mode: false
    }
  };

  return nextPreferences;
}

export function applyAssistantSecurePreferenceLock(securePreferences, extensionId, extensionPath) {
  const nextSecurePreferences = cloneJson(securePreferences);
  const extensions = isRecord(nextSecurePreferences.extensions) ? nextSecurePreferences.extensions : {};
  const settings = isRecord(extensions.settings) ? extensions.settings : {};
  const existingEntry = isRecord(settings[extensionId]) ? settings[extensionId] : {};

  nextSecurePreferences.extensions = {
    ...extensions,
    ui: {
      ...(isRecord(extensions.ui) ? extensions.ui : {}),
      developer_mode: false
    },
    settings: {
      ...settings,
      [extensionId]: {
        ...existingEntry,
        ...(typeof extensionPath === "string" && extensionPath.trim().length > 0 ? { path: path.resolve(extensionPath) } : {}),
        open_side_panel_on_icon_click: true,
        was_installed_by_default: true,
        was_installed_by_oem: false
      }
    }
  };

  return nextSecurePreferences;
}

export async function hardenAssistantProfile({
  profileRoot,
  extensionPath,
  explicitExtensionId
}) {
  const preferencesPath = path.join(profileRoot, "Default", "Preferences");
  const securePreferencesPath = path.join(profileRoot, "Default", "Secure Preferences");
  const preferences = await readJson(preferencesPath);
  const securePreferences = await readJson(securePreferencesPath);
  const extensionId = resolveAssistantExtensionId({
    preferences,
    securePreferences,
    extensionPath,
    explicitExtensionId
  });

  if (!extensionId) {
    return {
      applied: false,
      extensionId: null,
      preferencesChanged: false,
      securePreferencesChanged: false
    };
  }

  const nextPreferences = applyAssistantPreferenceLock(preferences, extensionId);
  const nextSecurePreferences = applyAssistantSecurePreferenceLock(securePreferences, extensionId, extensionPath);

  return {
    applied: true,
    extensionId,
    preferencesChanged: await writeJsonIfChanged(preferencesPath, nextPreferences, preferences),
    securePreferencesChanged: await writeJsonIfChanged(securePreferencesPath, nextSecurePreferences, securePreferences)
  };
}
