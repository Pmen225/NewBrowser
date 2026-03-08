import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

import type { ChromeCdpTransport } from "./cdp/chrome-cdp-transport";

interface TargetInfoLike {
  targetId: string;
  type: string;
  url: string;
  title?: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(filePath: string): Promise<JsonRecord | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as JsonRecord;
  } catch {
    return null;
  }
}

function matchExtensionIdFromSettings(settings: unknown, extensionPath: string): string | null {
  if (!isRecord(settings)) {
    return null;
  }

  const normalizedExtensionPath = resolve(extensionPath);
  for (const [extensionId, entry] of Object.entries(settings)) {
    if (!isRecord(entry)) {
      continue;
    }
    const installedPath = typeof entry.path === "string" ? resolve(entry.path) : "";
    if (installedPath === normalizedExtensionPath) {
      return extensionId;
    }
  }

  return null;
}

function extractExtensionIdFromTargetUrl(url: string): string | null {
  const match = /^chrome-extension:\/\/([^/]+)\//i.exec(url);
  return match?.[1] ?? null;
}

export function resolveDefaultChromeProfileRoot(): string {
  const explicit = process.env.CHROME_USER_DATA_DIR?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  return resolve(join(homedir(), ".local", "share", "new-browser", "chrome-profile"));
}

export async function resolveInstalledExtensionId(options: {
  extensionPath?: string;
  explicitExtensionId?: string;
  profileRoot?: string;
}): Promise<string | null> {
  const explicit = options.explicitExtensionId?.trim();
  if (explicit) {
    return explicit;
  }

  if (!options.extensionPath) {
    return null;
  }

  const profileRoot = options.profileRoot?.trim() || resolveDefaultChromeProfileRoot();
  const securePreferences = await readJson(join(profileRoot, "Default", "Secure Preferences"));
  const preferences = await readJson(join(profileRoot, "Default", "Preferences"));

  const fromSecure = matchExtensionIdFromSettings(securePreferences?.extensions?.settings, options.extensionPath);
  if (fromSecure) {
    return fromSecure;
  }

  return matchExtensionIdFromSettings(preferences?.extensions?.settings, options.extensionPath);
}

export function summarizeExtensionPresence(options: {
  targetInfos?: TargetInfoLike[];
  installedExtensionId?: string | null;
}) {
  const targetInfos = options.targetInfos ?? [];
  const targetExtensionIds = targetInfos
    .map((target) => (typeof target.url === "string" ? extractExtensionIdFromTargetUrl(target.url) : null))
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const installedExtensionId = options.installedExtensionId ?? null;
  const matchingTargetId =
    installedExtensionId && targetExtensionIds.includes(installedExtensionId)
      ? installedExtensionId
      : targetExtensionIds[0] ?? null;

  const targetDetected = matchingTargetId !== null;
  const extensionId = matchingTargetId ?? installedExtensionId;

  return {
    loaded: targetDetected || Boolean(installedExtensionId),
    targetDetected,
    installed: Boolean(installedExtensionId),
    extensionId,
    detectionSource: targetDetected ? "targets" : installedExtensionId ? "profile" : "none"
  };
}

export async function detectExtensionPresence(
  transport: ChromeCdpTransport,
  options: {
    extensionPath?: string;
    explicitExtensionId?: string;
    profileRoot?: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
) {
  const deadline = Date.now() + (options.timeoutMs ?? 4_000);
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const installedExtensionId = await resolveInstalledExtensionId(options);
  let lastSummary = summarizeExtensionPresence({
    targetInfos: [],
    installedExtensionId
  });

  while (Date.now() <= deadline) {
    try {
      const targets = await transport.send<{ targetInfos?: TargetInfoLike[] }>("Target.getTargets", {});
      lastSummary = summarizeExtensionPresence({
        targetInfos: targets.targetInfos ?? [],
        installedExtensionId
      });
      if (lastSummary.loaded) {
        return lastSummary;
      }
    } catch {
      // Ignore temporary CDP target errors during startup.
    }

    await new Promise((resolveSleep) => {
      setTimeout(resolveSleep, pollIntervalMs);
    });
  }

  return lastSummary;
}
