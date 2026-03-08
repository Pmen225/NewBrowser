import { execFile as execFileCallback, spawn } from "node:child_process";
import { access, constants, mkdir, mkdtemp } from "node:fs/promises";
import { closeSync, openSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { hardenAssistantProfile } from "./lib/assistant-profile-lock.js";
import { defaultChromeProfileRoot, resolveRunningChromeCdpWsUrl } from "./lib/cdp-discovery.js";
import {
  activateChromiumDesktop,
  openAssistantSidePanel,
  waitForSidecarHealth
} from "./lib/assistant-activation.js";

const DEFAULT_POLL_INTERVAL_MS = 250;
const DEFAULT_STARTUP_TIMEOUT_MS = 20_000;
const DEFAULT_PORT_CANDIDATES = [9555, 9444, 9333, 9222];
const DEFAULT_HEALTH_TIMEOUT_MS = 30_000;
const DEFAULT_ATTACHED_TAB_TIMEOUT_MS = 10_000;

function parseNumber(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
  if (fromEnv) {
    return resolve(fromEnv);
  }

  const localExtensionPath = resolve(process.cwd(), "extension");
  if (await pathExists(localExtensionPath)) {
    return localExtensionPath;
  }

  throw new Error(`Extension path is required but was not found: ${localExtensionPath}`);
}

async function resolvePreferredBinaryPath() {
  const explicit = process.env.NEW_BROWSER_BROWSER_BINARY?.trim() || process.env.COMET_BROWSER_BINARY?.trim();
  if (explicit) {
    if (!(await pathIsExecutable(explicit))) {
      throw new Error(`Configured browser binary is not executable: ${explicit}`);
    }
    return explicit;
  }

  const candidates = [
    join(homedir(), ".local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium"),
    "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium"
  ];

  for (const candidate of candidates) {
    if (await pathIsExecutable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find an executable ungoogled Chromium binary. Checked: ${candidates.join(", ")}`);
}

async function execFile(file, args) {
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

async function resolveExistingCdpWebSocketUrl() {
  const explicitWsUrl = process.env.CHROME_CDP_WS_URL?.trim();
  if (explicitWsUrl) {
    return explicitWsUrl;
  }

  const host = process.env.CHROME_CDP_HOST ?? "127.0.0.1";
  const port = process.env.CHROME_CDP_PORT ?? "9222";
  const versionUrl = process.env.CHROME_CDP_HTTP_URL?.trim() || `http://${host}:${port}/json/version`;

  try {
    const response = await fetch(versionUrl);
    if (!response.ok) {
      return resolveRunningChromeCdpWsUrl({
        profileRoot: defaultChromeProfileRoot(),
        host
      });
    }
    const payload = await response.json();
    if (typeof payload.webSocketDebuggerUrl === "string") {
      return payload.webSocketDebuggerUrl;
    }
    return resolveRunningChromeCdpWsUrl({
      profileRoot: defaultChromeProfileRoot(),
      host
    });
  } catch {
    return resolveRunningChromeCdpWsUrl({
      profileRoot: defaultChromeProfileRoot(),
      host
    });
  }
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
    "--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "about:blank"
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

async function waitForAttachedPageTabs(healthUrl, timeoutMs = DEFAULT_ATTACHED_TAB_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload?.tabs) && payload.tabs.length > 0) {
          return payload;
        }
      }
    } catch {
      // Server may still be stabilizing.
    }

    await new Promise((resolveSleep) => setTimeout(resolveSleep, DEFAULT_POLL_INTERVAL_MS));
  }

  throw new Error(`Assistant sidecar did not attach a browser tab at ${healthUrl}`);
}

function spawnServer(cdpWsUrl) {
  return spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "tsx", "sidecar/src/server.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      CHROME_CDP_WS_URL: cdpWsUrl
    }
  });
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await new Promise((resolveStop) => {
    const timer = setTimeout(resolveStop, 2_000);
    serverProcess.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

async function launchBrowser() {
  const binaryPath = await resolvePreferredBinaryPath();
  const extensionPath = await resolveExtensionPath();
  const explicitUserDataDir = process.env.CHROME_USER_DATA_DIR?.trim() || undefined;
  const explicitPort = process.env.CHROME_CDP_PORT?.trim();
  const portCandidates = explicitPort ? [parseNumber(explicitPort, 9222)] : DEFAULT_PORT_CANDIDATES;
  const persistentDir = explicitUserDataDir || defaultChromeProfileRoot();

  const existingWsUrl = await resolveRunningChromeCdpWsUrl({
    profileRoot: persistentDir
  });
  if (existingWsUrl) {
    return { browserProcess: undefined, cdpWsUrl: existingWsUrl };
  }

  if (process.platform === "darwin") {
    try {
      await execFile("pkill", ["-x", "Chromium"]);
    } catch {
      // No running Chromium process to stop.
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 1_500));
  }

  const browserEnv = { ...process.env };
  for (const key of Object.keys(browserEnv)) {
    if (key.startsWith("npm_") || key.startsWith("npx_")) {
      delete browserEnv[key];
    }
  }
  delete browserEnv._;

  let lastError;

  for (const debuggingPort of portCandidates) {
    const userDataDir = explicitUserDataDir || persistentDir;
    await mkdir(userDataDir, { recursive: true }).catch(() => {});
    await hardenAssistantProfile({
      profileRoot: userDataDir,
      extensionPath
    }).catch(() => {});
    const stdoutLogFd = openSync(join(userDataDir, "launcher.stdout.log"), "a");
    const stderrLogFd = openSync(join(userDataDir, "launcher.stderr.log"), "a");

    let browserProcess;
    try {
      browserProcess = spawn(binaryPath, createBrowserArgs({ debuggingPort, userDataDir, extensionPath }), {
        stdio: ["ignore", stdoutLogFd, stderrLogFd],
        env: browserEnv
      });
    } finally {
      closeSync(stdoutLogFd);
      closeSync(stderrLogFd);
    }

    try {
      const cdpWsUrl = await pollForCdpReady(debuggingPort, DEFAULT_STARTUP_TIMEOUT_MS);
      await hardenAssistantProfile({
        profileRoot: userDataDir,
        extensionPath
      }).catch(() => {});
      return { browserProcess, cdpWsUrl };
    } catch (error) {
      lastError = error;
      try {
        browserProcess.kill("SIGTERM");
      } catch {
        // Ignore cleanup failures.
      }
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 500));
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Failed to launch browser");
}

async function main() {
  let browserProcess;
  let serverProcess;
  try {
    let cdpWsUrl = await resolveExistingCdpWebSocketUrl();
    if (!cdpWsUrl) {
      const launched = await launchBrowser();
      browserProcess = launched.browserProcess;
      cdpWsUrl = launched.cdpWsUrl;
    }

    const healthUrl = `http://${process.env.SIDECAR_HOST?.trim() || "127.0.0.1"}:${parseNumber(process.env.SIDECAR_PORT, 3210)}/health`;
    let sidecarHealthy = false;

    try {
      await waitForSidecarHealth({
        healthUrl,
        timeoutMs: 750,
        pollMs: 150
      });
      sidecarHealthy = true;
    } catch {
      sidecarHealthy = false;
    }

    if (!sidecarHealthy) {
      serverProcess = spawnServer(cdpWsUrl);
      await waitForSidecarHealth({
        healthUrl,
        timeoutMs: DEFAULT_HEALTH_TIMEOUT_MS
      });
    }

    try {
      await waitForAttachedPageTabs(healthUrl);
    } catch {
      if (!serverProcess) {
        throw new Error(`Assistant sidecar is healthy but has no attached browser tabs at ${healthUrl}`);
      }
      await stopServer(serverProcess);
      serverProcess = spawnServer(cdpWsUrl);
      await waitForSidecarHealth({
        healthUrl,
        timeoutMs: DEFAULT_HEALTH_TIMEOUT_MS
      });
      await waitForAttachedPageTabs(healthUrl);
    }

    await openAssistantSidePanel({
      browserWsUrl: cdpWsUrl
    });
    await activateChromiumDesktop().catch(() => {});

    const shutdown = (signal) => {
      if (browserProcess && !browserProcess.killed) {
        try {
          browserProcess.kill(signal);
        } catch {
          // Ignore cleanup failures.
        }
      }
      if (serverProcess && !serverProcess.killed) {
        try {
          serverProcess.kill(signal);
        } catch {
          // Ignore cleanup failures.
        }
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    if (!serverProcess) {
      return;
    }

    serverProcess.on("exit", (code, signal) => {
      // Do not kill the browser when the server exits—leave it open so you can keep using the panel.
      // Browser is only killed on explicit SIGINT/SIGTERM to this process (shutdown()).
      if (signal) {
        if (browserProcess && !browserProcess.killed) {
          try {
            browserProcess.kill(signal);
          } catch {
            // Ignore cleanup failures.
          }
        }
        process.kill(process.pid, signal);
        return;
      }
      process.exit(code ?? 0);
    });
  } catch (error) {
    if (browserProcess && !browserProcess.killed) {
      try {
        browserProcess.kill("SIGTERM");
      } catch {
        // Ignore cleanup failures.
      }
    }
    console.error("Failed to start sidecar server:");
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  }
}

main();
