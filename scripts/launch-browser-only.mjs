#!/usr/bin/env node
/**
 * Launch Chromium with the Assistant extension only (no sidecar).
 * Browser stays open after this script exits. Use for inspecting the extension UI.
 * Same env vars as start-sidecar: NEW_BROWSER_EXTENSION_PATH, NEW_BROWSER_BROWSER_BINARY, etc.
 */
import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { hardenAssistantProfile } from "./lib/assistant-profile-lock.js";
import {
  defaultChromeProfileRoot,
  isProcessInspectionPermissionFailure,
  resolveRunningChromeCdpWsUrl
} from "./lib/cdp-discovery.js";

const DEFAULT_PORT_CANDIDATES = [9555, 9444, 9333, 9222];
const DEFAULT_STARTUP_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

async function pathExists(pathValue) {
  try {
    await access(pathValue, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathIsExecutable(pathValue) {
  try {
    await access(pathValue, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExtensionPath() {
  const fromEnv = process.env.NEW_BROWSER_EXTENSION_PATH?.trim() || process.env.COMET_EXTENSION_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  const local = resolve(process.cwd(), "extension");
  if (await pathExists(local)) return local;
  throw new Error(`Extension not found: ${local}`);
}

async function resolveBinaryPath() {
  const explicit = process.env.NEW_BROWSER_BROWSER_BINARY?.trim() || process.env.COMET_BROWSER_BINARY?.trim();
  if (explicit) {
    if (!(await pathIsExecutable(explicit))) throw new Error(`Not executable: ${explicit}`);
    return explicit;
  }
  const candidates = [
    join(homedir(), ".local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium"),
    "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium",
  ];
  for (const c of candidates) {
    if (await pathIsExecutable(c)) return c;
  }
  throw new Error(`Chromium not found. Checked: ${candidates.join(", ")}`);
}

function createBrowserArgs({ debuggingPort, userDataDir, extensionPath }) {
  return [
    "--enable-logging=stderr",
    "--v=1",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-translate",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "about:blank",
  ];
}

async function pollForCdpReady(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const versionUrl = `http://127.0.0.1:${port}/json/version`;

  while (Date.now() <= deadline) {
    try {
      const response = await fetch(versionUrl);
      if (response.ok) {
        const payload = await response.json();
        if (typeof payload.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0) {
          return payload.webSocketDebuggerUrl;
        }
      }
    } catch {
      // Browser is still starting.
    }

    await new Promise((resolveSleep) => setTimeout(resolveSleep, DEFAULT_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for a Chrome CDP endpoint on port ${port}`);
}

async function main() {
  const binaryPath = await resolveBinaryPath();
  const extensionPath = await resolveExtensionPath();
  const userDataDir = defaultChromeProfileRoot();
  await mkdir(userDataDir, { recursive: true }).catch(() => {});
  await hardenAssistantProfile({
    profileRoot: userDataDir,
    extensionPath
  }).catch(() => {});

  const port = process.env.CHROME_CDP_PORT ? parseInt(process.env.CHROME_CDP_PORT, 10) : DEFAULT_PORT_CANDIDATES[0];
  let existingWsUrl;
  try {
    existingWsUrl = await resolveRunningChromeCdpWsUrl({
      profileRoot: userDataDir,
      portCandidates: [port, ...DEFAULT_PORT_CANDIDATES]
    });
  } catch (error) {
    if (!isProcessInspectionPermissionFailure(error)) {
      throw error;
    }
    console.warn("CDP process inspection is not permitted in this environment; continuing with fresh browser launch.");
  }
  if (existingWsUrl) {
    console.log("Browser already running for this profile.");
    console.log("CDP websocket:", existingWsUrl);
    return;
  }
  const args = createBrowserArgs({ debuggingPort: port, userDataDir, extensionPath });

  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("npm_") || key.startsWith("npx_")) delete env[key];
  }
  delete env._;

  const child = spawn(binaryPath, args, {
    detached: true,
    stdio: "ignore",
    env,
  });
  child.unref();
  await pollForCdpReady(port, DEFAULT_STARTUP_TIMEOUT_MS);
  await hardenAssistantProfile({
    profileRoot: userDataDir,
    extensionPath
  }).catch(() => {});
  console.log("Browser launched (extension:", extensionPath, "). It will stay open after this script exits.");
  console.log("Assistant sidecar was not started. Use `npm run launch:browser` or `npm start` for a working assistant session.");
  console.log("CDP port:", port);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
