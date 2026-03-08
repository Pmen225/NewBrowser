import { execFile as execFileCallback } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

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
  const { stdout } = await execFileImpl("ps", ["axww", "-o", "command="]);
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

export async function resolveRunningChromeCdpWsUrl({
  profileRoot = defaultChromeProfileRoot(),
  host = "127.0.0.1",
  execFileImpl = execFile,
  fetchImpl = globalThis.fetch
} = {}) {
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
