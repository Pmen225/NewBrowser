import { execFileSync as defaultExecFileSync } from "node:child_process";
import { existsSync as defaultExistsSync, readFileSync as defaultReadFileSync, readdirSync as defaultReadDirSync } from "node:fs";
import { join } from "node:path";

import type { BlockedDomainsPolicy } from "./blocked-domains";

type ExecFileSyncLike = (
  command: string,
  args: string[],
  options: { encoding: BufferEncoding; maxBuffer?: number; windowsHide?: boolean }
) => string;
type ExistsSyncLike = (path: string) => boolean;
type ReadFileSyncLike = (path: string, options: { encoding: BufferEncoding }) => string;
type ReadDirSyncLike = (path: string, options: { withFileTypes: true }) => Array<{ name: string; isFile: () => boolean }>;

export interface BlockedDomainsPolicyLoaderDeps {
  platform: NodeJS.Platform;
  existsSync: ExistsSyncLike;
  readFileSync: ReadFileSyncLike;
  readDirSync: ReadDirSyncLike;
  execFileSync: ExecFileSyncLike;
}

export interface LoadBlockedDomainsPolicyFromSystemOptions {
  forceReload?: boolean;
  deps?: Partial<BlockedDomainsPolicyLoaderDeps>;
}

const LINUX_POLICY_DIRS = ["/etc/chromium/policies/managed", "/etc/opt/chrome/policies/managed"] as const;
const MAC_POLICY_FILES = [
  "/Library/Managed Preferences/com.google.Chrome.plist",
  "/Library/Managed Preferences/com.google.Chrome.json",
  "/Library/Managed Preferences/org.chromium.Chromium.plist",
  "/Library/Managed Preferences/org.chromium.Chromium.json"
] as const;
const WINDOWS_POLICY_ROOTS = [
  "HKLM\\Software\\Policies\\Google\\Chrome",
  "HKCU\\Software\\Policies\\Google\\Chrome",
  "HKLM\\Software\\Policies\\Chromium",
  "HKCU\\Software\\Policies\\Chromium"
] as const;

const defaultDeps: BlockedDomainsPolicyLoaderDeps = {
  platform: process.platform,
  existsSync: defaultExistsSync,
  readFileSync: defaultReadFileSync,
  readDirSync: defaultReadDirSync,
  execFileSync: defaultExecFileSync
};

let cachedPolicy: BlockedDomainsPolicy | undefined;

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function normalizeListEntry(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

function normalizePolicyList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupe(value.map(normalizeListEntry).filter((entry): entry is string => entry !== undefined));
  }

  const record = toRecord(value);
  if (record) {
    const entries = Object.entries(record)
      .filter(([, entryValue]) => typeof entryValue === "string")
      .sort(([leftKey], [rightKey]) => {
        const leftNumber = Number(leftKey);
        const rightNumber = Number(rightKey);
        const leftNumeric = Number.isFinite(leftNumber);
        const rightNumeric = Number.isFinite(rightNumber);

        if (leftNumeric && rightNumeric) {
          return leftNumber - rightNumber;
        }

        return leftKey.localeCompare(rightKey);
      })
      .map(([, entryValue]) => normalizeListEntry(entryValue))
      .filter((entry): entry is string => entry !== undefined);

    return dedupe(entries);
  }

  const single = normalizeListEntry(value);
  if (single) {
    return [single];
  }

  return [];
}

function extractPolicyFromPayload(value: unknown): BlockedDomainsPolicy {
  const record = toRecord(value);
  if (!record) {
    return {};
  }

  const blocklist = normalizePolicyList(record.URLBlocklist);
  const allowlist = dedupe([
    ...normalizePolicyList(record.URLAllowlist),
    ...normalizePolicyList(record.URLWhitelist)
  ]);

  return {
    blocklist,
    allowlist
  };
}

function mergePolicy(base: BlockedDomainsPolicy, incoming: BlockedDomainsPolicy): BlockedDomainsPolicy {
  return {
    blocklist: dedupe([...(base.blocklist ?? []), ...(incoming.blocklist ?? [])]),
    allowlist: dedupe([...(base.allowlist ?? []), ...(incoming.allowlist ?? [])])
  };
}

function parseJsonPolicy(raw: string): BlockedDomainsPolicy {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return extractPolicyFromPayload(parsed);
  } catch {
    return {};
  }
}

function runExec(deps: BlockedDomainsPolicyLoaderDeps, command: string, args: string[]): string | undefined {
  try {
    return deps.execFileSync(command, args, {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true
    });
  } catch {
    return undefined;
  }
}

function parseRegistryQueryValues(raw: string): string[] {
  const lines = raw.split(/\r?\n/);
  const values: string[] = [];

  for (const line of lines) {
    const match = /^\s*([^\s]+)\s+REG_\w+\s+(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const value = match[2]?.trim() ?? "";
    if (value.length === 0) {
      continue;
    }

    const parts = value
      .split(/\u0000|\\0/g)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    values.push(...parts);
  }

  return dedupe(values);
}

function loadLinuxPolicy(deps: BlockedDomainsPolicyLoaderDeps): BlockedDomainsPolicy {
  let merged: BlockedDomainsPolicy = {};

  for (const directory of LINUX_POLICY_DIRS) {
    if (!deps.existsSync(directory)) {
      continue;
    }

    let entries: Array<{ name: string; isFile: () => boolean }>;
    try {
      entries = deps.readDirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const filePath = join(directory, entry.name);
      try {
        const fileRaw = deps.readFileSync(filePath, { encoding: "utf8" });
        merged = mergePolicy(merged, parseJsonPolicy(fileRaw));
      } catch {
        // Ignore malformed or unreadable managed policy files.
      }
    }
  }

  return merged;
}

function loadMacPolicy(deps: BlockedDomainsPolicyLoaderDeps): BlockedDomainsPolicy {
  let merged: BlockedDomainsPolicy = {};

  for (const filePath of MAC_POLICY_FILES) {
    if (!deps.existsSync(filePath)) {
      continue;
    }

    let raw: string | undefined;
    if (filePath.endsWith(".plist")) {
      raw = runExec(deps, "plutil", ["-convert", "json", "-o", "-", filePath]);
    } else {
      try {
        raw = deps.readFileSync(filePath, { encoding: "utf8" });
      } catch {
        raw = undefined;
      }
    }

    if (!raw) {
      continue;
    }

    merged = mergePolicy(merged, parseJsonPolicy(raw));
  }

  return merged;
}

function loadWindowsPolicy(deps: BlockedDomainsPolicyLoaderDeps): BlockedDomainsPolicy {
  let merged: BlockedDomainsPolicy = {};

  for (const root of WINDOWS_POLICY_ROOTS) {
    const directBlocklistRaw = runExec(deps, "reg", ["query", root, "/v", "URLBlocklist"]);
    const directAllowlistRaw = runExec(deps, "reg", ["query", root, "/v", "URLAllowlist"]);
    const directWhitelistRaw = runExec(deps, "reg", ["query", root, "/v", "URLWhitelist"]);

    merged = mergePolicy(merged, {
      blocklist: directBlocklistRaw ? parseRegistryQueryValues(directBlocklistRaw) : [],
      allowlist: dedupe([
        ...(directAllowlistRaw ? parseRegistryQueryValues(directAllowlistRaw) : []),
        ...(directWhitelistRaw ? parseRegistryQueryValues(directWhitelistRaw) : [])
      ])
    });

    const listBlockRaw = runExec(deps, "reg", ["query", `${root}\\URLBlocklist`]);
    const listAllowRaw = runExec(deps, "reg", ["query", `${root}\\URLAllowlist`]);
    const listWhiteRaw = runExec(deps, "reg", ["query", `${root}\\URLWhitelist`]);

    merged = mergePolicy(merged, {
      blocklist: listBlockRaw ? parseRegistryQueryValues(listBlockRaw) : [],
      allowlist: dedupe([
        ...(listAllowRaw ? parseRegistryQueryValues(listAllowRaw) : []),
        ...(listWhiteRaw ? parseRegistryQueryValues(listWhiteRaw) : [])
      ])
    });
  }

  return merged;
}

function resolveDeps(options?: LoadBlockedDomainsPolicyFromSystemOptions): BlockedDomainsPolicyLoaderDeps {
  return {
    ...defaultDeps,
    ...(options?.deps ?? {})
  };
}

function clonePolicy(policy: BlockedDomainsPolicy): BlockedDomainsPolicy {
  return {
    blocklist: [...(policy.blocklist ?? [])],
    allowlist: [...(policy.allowlist ?? [])]
  };
}

export function loadBlockedDomainsPolicyFromSystem(options?: LoadBlockedDomainsPolicyFromSystemOptions): BlockedDomainsPolicy {
  if (!options?.forceReload && cachedPolicy) {
    return clonePolicy(cachedPolicy);
  }

  const deps = resolveDeps(options);
  let policy: BlockedDomainsPolicy;

  if (deps.platform === "linux") {
    policy = loadLinuxPolicy(deps);
  } else if (deps.platform === "darwin") {
    policy = loadMacPolicy(deps);
  } else if (deps.platform === "win32") {
    policy = loadWindowsPolicy(deps);
  } else {
    policy = {};
  }

  cachedPolicy = {
    blocklist: dedupe(policy.blocklist ?? []),
    allowlist: dedupe(policy.allowlist ?? [])
  };

  return clonePolicy(cachedPolicy);
}
