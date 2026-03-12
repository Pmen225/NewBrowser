import { execFile as execFileCallback } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const DEFAULT_CDP_PORT_CANDIDATES = Object.freeze([9555, 9444, 9333, 9222]);

function execFile(file, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    execFileCallback(file, args, (error, stdout, stderr) => {
      if (error) {
        rejectPromise(error);
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

export function classifyCdpDiscoveryFailure(error) {
  if (typeof error?.classification === "string" && error.classification.trim()) {
    return {
      classification: error.classification.trim(),
      code: typeof error?.code === "string" ? error.code : "UNKNOWN",
      message: error instanceof Error ? error.message : String(error)
    };
  }

  const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
  const message = error instanceof Error ? error.message : String(error);

  if (code === "EPERM" || code === "EACCES") {
    return {
      classification: "process_inspection_permission_failure",
      code,
      message
    };
  }

  if (code === "ENOENT") {
    return {
      classification: "process_inspection_binary_missing",
      code,
      message
    };
  }

  return {
    classification: "process_inspection_failure",
    code,
    message
  };
}

export function formatCdpDiscoveryFailure(error) {
  const verdict = classifyCdpDiscoveryFailure(error);
  return `classification=${verdict.classification}; code=${verdict.code}; message=${verdict.message}`;
}

export function isProcessInspectionPermissionFailure(error) {
  return classifyCdpDiscoveryFailure(error).classification === "process_inspection_permission_failure";
}

export function defaultChromeProfileRoot() {
  return resolve(process.env.CHROME_USER_DATA_DIR?.trim() || join(homedir(), ".local", "share", "new-browser", "chrome-profile"));
}

export function parseRemoteDebuggingPort(command, { profileRoot = defaultChromeProfileRoot() } = {}) {
  const text = typeof command === "string" ? command : "";
  const normalizedProfileRoot = resolve(profileRoot);
  if (!text || !normalizedProfileRoot || !text.includes(`--user-data-dir=${normalizedProfileRoot}`)) {
    return null;
  }

  const match = text.match(/--remote-debugging-port=(\d+)/);
  if (!match) {
    return null;
  }

  const port = Number.parseInt(match[1], 10);
  return Number.isFinite(port) && port > 0 ? port : null;
}

export async function listChromeCommands({ execFileImpl = execFile } = {}) {
  let stdout;
  try {
    ({ stdout } = await execFileImpl("ps", ["axww", "-o", "command="]));
  } catch (error) {
    const verdict = classifyCdpDiscoveryFailure(error);
    const wrapped = new Error(`Unable to inspect running Chromium processes via ps. ${verdict.message}`);
    wrapped.code = verdict.code;
    wrapped.classification = verdict.classification;
    throw wrapped;
  }

  return String(stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function findRunningChromeCdpPort({
  profileRoot = defaultChromeProfileRoot(),
  execFileImpl = execFile
} = {}) {
  const commands = await listChromeCommands({ execFileImpl });
  for (const command of commands) {
    const port = parseRemoteDebuggingPort(command, { profileRoot });
    if (port) {
      return port;
    }
  }
  return null;
}

export async function fetchCdpWebSocketUrl({
  host = "127.0.0.1",
  port,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!Number.isFinite(port) || port <= 0) {
    return undefined;
  }

  try {
    const response = await fetchImpl(`http://${host}:${port}/json/version`);
    if (!response.ok) {
      return undefined;
    }
    const payload = await response.json();
    return typeof payload?.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0
      ? payload.webSocketDebuggerUrl
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveCandidatePorts({
  portCandidates = DEFAULT_CDP_PORT_CANDIDATES,
  envPort = process.env.CHROME_CDP_PORT
} = {}) {
  const resolved = [];
  const seen = new Set();

  const pushPort = (value) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || seen.has(parsed)) {
      return;
    }
    seen.add(parsed);
    resolved.push(parsed);
  };

  pushPort(envPort);
  for (const candidate of portCandidates) {
    pushPort(candidate);
  }
  return resolved;
}

export async function resolveCdpWsUrlFromCandidatePorts({
  host = "127.0.0.1",
  fetchImpl = globalThis.fetch,
  portCandidates = DEFAULT_CDP_PORT_CANDIDATES
} = {}) {
  for (const port of resolveCandidatePorts({ portCandidates })) {
    const wsUrl = await fetchCdpWebSocketUrl({
      host,
      port,
      fetchImpl
    });
    if (wsUrl) {
      return wsUrl;
    }
  }

  return undefined;
}

export async function resolveRunningChromeCdpWsUrl({
  profileRoot = defaultChromeProfileRoot(),
  host = "127.0.0.1",
  portCandidates = DEFAULT_CDP_PORT_CANDIDATES,
  execFileImpl = execFile,
  fetchImpl = globalThis.fetch
} = {}) {
  const direct = await resolveCdpWsUrlFromCandidatePorts({
    host,
    fetchImpl,
    portCandidates
  });
  if (direct) {
    return direct;
  }

  const port = await findRunningChromeCdpPort({
    profileRoot,
    execFileImpl
  });
  if (!port) {
    return undefined;
  }

  return fetchCdpWebSocketUrl({
    host,
    port,
    fetchImpl
  });
}
