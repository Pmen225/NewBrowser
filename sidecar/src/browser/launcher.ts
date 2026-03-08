import { execFile as defaultExecFile, spawn as defaultSpawn, type ChildProcess } from "node:child_process";
import { closeSync as defaultCloseSync, openSync as defaultOpenSync } from "node:fs";
import { access as defaultAccess, constants, mkdir as defaultMkdir, mkdtemp as defaultMkdtemp, realpath as defaultRealpath } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type BrowserDiscoveryPolicy = "ungoogled_only" | "prefer_ungoogled" | "any_chromium";
export type BrowserFlavor = "ungoogled" | "chromium" | "google_chrome";

export interface BrowserBinaryCandidate {
  executablePath: string;
  flavor: BrowserFlavor;
  source: "known_path" | "path_lookup" | "override";
}

export interface BrowserLaunchOptions {
  /** Override binary path; skips auto-discovery if set */
  binaryPath?: string;
  /** CDP remote debugging port. Default: 9222 */
  debuggingPort?: number;
  /** User data directory. Default: temp dir */
  userDataDir?: string;
  /** Max time (ms) to wait for browser to be ready. Default: 15000 */
  startupTimeoutMs?: number;
  /** Polling interval (ms) for /json/version. Default: 250 */
  pollIntervalMs?: number;
  /** Extra CLI args passed to browser */
  extraArgs?: string[];
  /** Path to the extension directory to load */
  extensionPath?: string;
  /** Browser discovery policy. Default: ungoogled_only */
  browserPolicy?: BrowserDiscoveryPolicy;
  /** Whether extension is mandatory. Default: true */
  requireExtension?: boolean;
}

export interface BrowserLaunchResult {
  cdpWsUrl: string;
  debuggingPort: number;
  process: ChildProcess;
  browser: BrowserBinaryCandidate;
  extensionLoaded: boolean;
}

const DEFAULT_CDP_PORT = 9222;
const DEFAULT_STARTUP_TIMEOUT_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

export class BrowserLaunchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BrowserLaunchError";
    this.code = code;
  }
}

function isExecutableMode(): number {
  return process.platform === "win32" ? constants.F_OK : constants.X_OK;
}

async function pathIsExecutable(candidate: string): Promise<boolean> {
  try {
    await defaultAccess(candidate, isExecutableMode());
    return true;
  } catch {
    return false;
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await defaultAccess(candidate, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeForFlavor(value: string): string {
  return value.toLowerCase().replace(/\\/g, "/");
}

function resolveFlavor(executablePath: string, resolvedPath: string): BrowserFlavor {
  const normalizedResolved = normalizeForFlavor(resolvedPath);
  const normalizedExecutable = normalizeForFlavor(executablePath);

  const isGoogleChromePath = (value: string): boolean =>
    value.includes("google chrome") || value.includes("/google/chrome/") || value.includes("/google chrome.app/") || value.endsWith("/chrome.exe");

  if (isGoogleChromePath(normalizedResolved)) {
    return "google_chrome";
  }

  if (normalizedExecutable.includes("ungoogled")) {
    return "ungoogled";
  }

  if (normalizedResolved.includes("ungoogled")) {
    return "ungoogled";
  }

  if (normalizedResolved.includes("chromium")) {
    return "chromium";
  }

  if (isGoogleChromePath(normalizedExecutable)) {
    return "google_chrome";
  }

  return "chromium";
}

function flavorAllowed(flavor: BrowserFlavor, policy: BrowserDiscoveryPolicy): boolean {
  if (policy === "any_chromium") {
    return true;
  }

  if (policy === "prefer_ungoogled") {
    return true;
  }

  return flavor === "ungoogled";
}

function candidateRank(flavor: BrowserFlavor, policy: BrowserDiscoveryPolicy): number {
  if (policy === "prefer_ungoogled") {
    if (flavor === "ungoogled") {
      return 0;
    }
    if (flavor === "chromium") {
      return 1;
    }
    return 2;
  }

  if (policy === "any_chromium") {
    if (flavor === "ungoogled") {
      return 0;
    }
    if (flavor === "chromium") {
      return 1;
    }
    return 2;
  }

  if (flavor === "ungoogled") {
    return 0;
  }
  if (flavor === "chromium") {
    return 1;
  }
  return 2;
}

function discoverKnownPaths(): string[] {
  if (process.platform === "darwin") {
    const home = homedir();
    return [
      "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Chromium-Gost.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      join(home, "Applications/ungoogled-chromium.app/Contents/MacOS/Chromium"),
      join(home, "Applications/Chromium.app/Contents/MacOS/Chromium"),
      join(home, ".local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium"),
      join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ];
  }

  if (process.platform === "linux") {
    return [
      "/usr/bin/ungoogled-chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable"
    ];
  }

  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"];
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    const localAppData = process.env["LOCALAPPDATA"];

    return [
      programFiles ? join(programFiles, "ungoogled-chromium", "Application", "chrome.exe") : "",
      programFiles ? join(programFiles, "Chromium", "Application", "chrome.exe") : "",
      programFiles ? join(programFiles, "Google", "Chrome", "Application", "chrome.exe") : "",
      programFilesX86 ? join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe") : "",
      localAppData ? join(localAppData, "Chromium", "Application", "chrome.exe") : ""
    ].filter((value) => value.length > 0);
  }

  return [];
}

function discoverPathCandidates(): string[] {
  if (process.platform === "darwin") {
    return ["ungoogled-chromium", "chromium", "chromium-browser", "google-chrome", "chrome"];
  }

  if (process.platform === "linux") {
    return ["ungoogled-chromium", "chromium-browser", "chromium", "google-chrome", "google-chrome-stable"];
  }

  if (process.platform === "win32") {
    return ["chrome.exe", "chromium.exe"];
  }

  return [];
}

async function lookupBinaryOnPath(binaryName: string): Promise<string[]> {
  const resolver = process.platform === "win32" ? "where" : "which";

  return new Promise<string[]>((resolvePath, rejectPath) => {
    defaultExecFile(resolver, [binaryName], (error, stdout) => {
      if (error) {
        rejectPath(error);
        return;
      }

      const entries = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolvePath(entries);
    });
  });
}

async function toCandidate(pathValue: string, source: BrowserBinaryCandidate["source"]): Promise<BrowserBinaryCandidate | null> {
  const executable = pathValue.trim();
  if (executable.length === 0) {
    return null;
  }

  if (!(await pathIsExecutable(executable))) {
    return null;
  }

  let resolvedPath = executable;
  try {
    resolvedPath = await defaultRealpath(executable);
  } catch {
    resolvedPath = executable;
  }

  return {
    executablePath: executable,
    flavor: resolveFlavor(executable, resolvedPath),
    source
  };
}

export async function discoverBrowserBinaryCandidate(policy: BrowserDiscoveryPolicy = "ungoogled_only"): Promise<BrowserBinaryCandidate> {
  const checked: string[] = [];
  const disallowed: BrowserBinaryCandidate[] = [];
  const allowed: BrowserBinaryCandidate[] = [];

  for (const candidatePath of discoverKnownPaths()) {
    checked.push(candidatePath);
    const candidate = await toCandidate(candidatePath, "known_path");
    if (!candidate) {
      continue;
    }

    if (flavorAllowed(candidate.flavor, policy)) {
      allowed.push(candidate);
    } else {
      disallowed.push(candidate);
    }
  }

  for (const pathCandidate of discoverPathCandidates()) {
    try {
      const found = await lookupBinaryOnPath(pathCandidate);
      for (const pathValue of found) {
        checked.push(pathValue);
        const candidate = await toCandidate(pathValue, "path_lookup");
        if (!candidate) {
          continue;
        }

        if (flavorAllowed(candidate.flavor, policy)) {
          allowed.push(candidate);
        } else {
          disallowed.push(candidate);
        }
      }
    } catch {
      continue;
    }
  }

  if (allowed.length > 0) {
    allowed.sort((left, right) => candidateRank(left.flavor, policy) - candidateRank(right.flavor, policy));
    return allowed[0];
  }

  if (disallowed.length > 0) {
    throw new BrowserLaunchError(
      "BINARY_POLICY_VIOLATION",
      `Found browser binaries but none satisfy policy ${policy}. Found: ${disallowed.map((item) => `${item.executablePath} (${item.flavor})`).join(", ")}`
    );
  }

  throw new BrowserLaunchError(
    "BINARY_NOT_FOUND",
    `Could not find a Chromium/Chrome executable. Checked: ${checked.length > 0 ? checked.join(", ") : "no known paths"}`
  );
}

export async function discoverBrowserBinary(policy: BrowserDiscoveryPolicy = "ungoogled_only"): Promise<string> {
  const candidate = await discoverBrowserBinaryCandidate(policy);
  return candidate.executablePath;
}

function createLaunchArgs(options: {
  debuggingPort: number;
  userDataDir: string;
  extensionPath?: string;
  extraArgs?: string[];
}): string[] {
  const args = [
    `--remote-debugging-port=${options.debuggingPort}`,
    `--user-data-dir=${options.userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-translate"
  ];

  if (process.platform === "darwin") {
    args.push("--enable-logging=stderr");
    args.push("--v=1");
  }

  if (options.extensionPath) {
    appendDisableFeaturesArg(args, options.extraArgs, [
      "DisableLoadExtensionCommandLineSwitch",
      "DisableDisableExtensionsExceptCommandLineSwitch"
    ]);
    args.push(`--disable-extensions-except=${options.extensionPath}`);
    args.push(`--load-extension=${options.extensionPath}`);
  }

  if (options.extraArgs && options.extraArgs.length > 0) {
    for (const extraArg of options.extraArgs) {
      if (extraArg.startsWith("--disable-features=") && args.some((value) => value.startsWith("--disable-features="))) {
        continue;
      }
      args.push(extraArg);
    }
  }

  if (!hasExplicitStartTarget(options.extraArgs)) {
    args.push("about:blank");
  }

  return args;
}

function appendDisableFeaturesArg(args: string[], extraArgs: string[] | undefined, requiredFeatures: string[]): void {
  const existing = extraArgs?.find((value) => value.startsWith("--disable-features="));
  const current = existing
    ? existing
        .slice("--disable-features=".length)
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];

  for (const feature of requiredFeatures) {
    if (!current.includes(feature)) {
      current.push(feature);
    }
  }

  if (current.length > 0) {
    args.push(`--disable-features=${current.join(",")}`);
  }
}

function hasExplicitStartTarget(extraArgs: string[] | undefined): boolean {
  if (!extraArgs || extraArgs.length === 0) {
    return false;
  }

  return extraArgs.some((value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return false;
    }

    if (!trimmed.startsWith("-")) {
      return true;
    }

    return trimmed.startsWith("--app=");
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function pollForCdpReady(port: number, timeoutMs: number, pollIntervalMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const endpoint = `http://127.0.0.1:${port}/json/version`;

  while (Date.now() <= deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const payload = (await response.json()) as {
          webSocketDebuggerUrl?: unknown;
        };
        if (typeof payload.webSocketDebuggerUrl === "string" && payload.webSocketDebuggerUrl.length > 0) {
          return payload.webSocketDebuggerUrl;
        }
      }
    } catch {
      // Browser may still be starting.
    }

    await sleep(pollIntervalMs);
  }

  throw new BrowserLaunchError("STARTUP_TIMEOUT", `Timed out waiting for Chrome CDP endpoint on port ${port}`);
}

function normalizePort(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_CDP_PORT;
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

export async function launchBrowser(options: BrowserLaunchOptions = {}): Promise<BrowserLaunchResult> {
  const debuggingPort = normalizePort(options.debuggingPort);
  const startupTimeoutMs = normalizePositiveInt(options.startupTimeoutMs, DEFAULT_STARTUP_TIMEOUT_MS);
  const pollIntervalMs = normalizePositiveInt(options.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS);
  const browserPolicy = options.browserPolicy ?? "ungoogled_only";
  const requireExtension = options.requireExtension ?? true;

  const extensionPath =
    options.extensionPath && options.extensionPath.trim().length > 0 ? resolve(options.extensionPath) : undefined;

  if (requireExtension) {
    if (!extensionPath) {
      throw new BrowserLaunchError("EXTENSION_REQUIRED_MISSING", "Extension path is required but was not provided");
    }

    if (!(await pathExists(extensionPath))) {
      throw new BrowserLaunchError("EXTENSION_REQUIRED_MISSING", `Extension path does not exist: ${extensionPath}`);
    }
  }

  const browserCandidate =
    options.binaryPath && options.binaryPath.trim().length > 0
      ? await toCandidate(options.binaryPath.trim(), "override")
      : await discoverBrowserBinaryCandidate(browserPolicy);

  if (!browserCandidate) {
    throw new BrowserLaunchError("BINARY_NOT_FOUND", "Provided browser binary path is not executable");
  }

  if (!flavorAllowed(browserCandidate.flavor, browserPolicy)) {
    throw new BrowserLaunchError(
      "BINARY_POLICY_VIOLATION",
      `Browser ${browserCandidate.executablePath} (${browserCandidate.flavor}) does not satisfy policy ${browserPolicy}`
    );
  }

  const userDataDir =
    options.userDataDir && options.userDataDir.trim().length > 0
      ? options.userDataDir.trim()
      : join(homedir(), ".local", "share", "new-browser", "chrome-profile");
  await defaultMkdir(userDataDir, { recursive: true });

  const launchArgs = createLaunchArgs({
    debuggingPort,
    userDataDir,
    extensionPath,
    extraArgs: options.extraArgs
  });

  const browserProcess = (() => {
    const stdoutLogFd = defaultOpenSync(join(userDataDir, "launcher.stdout.log"), "a");
    const stderrLogFd = defaultOpenSync(join(userDataDir, "launcher.stderr.log"), "a");

    try {
      return defaultSpawn(
        browserCandidate.executablePath,
        launchArgs,
        {
          stdio: ["ignore", stdoutLogFd, stderrLogFd]
        }
      );
    } finally {
      defaultCloseSync(stdoutLogFd);
      defaultCloseSync(stderrLogFd);
    }
  })();

  let launchError: BrowserLaunchError | null = null;
  const onError = (error: Error): void => {
    launchError = new BrowserLaunchError("LAUNCH_FAILED", `Failed to launch browser process: ${error.message}`);
  };

  const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    if (!launchError) {
      launchError = new BrowserLaunchError(
        "LAUNCH_FAILED",
        `Browser exited before CDP endpoint was ready (code: ${String(code)}, signal: ${String(signal)})`
      );
    }
  };

  browserProcess.once("error", onError);
  browserProcess.once("exit", onExit);

  try {
    const startedAt = Date.now();
    let cdpWsUrl: string | undefined;
    while (!cdpWsUrl) {
      if (launchError) {
        throw launchError;
      }

      const remainingMs = startupTimeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        throw new BrowserLaunchError("STARTUP_TIMEOUT", `Timed out waiting for Chrome CDP endpoint on port ${debuggingPort}`);
      }

      cdpWsUrl = await pollForCdpReady(debuggingPort, Math.min(remainingMs, pollIntervalMs), pollIntervalMs).catch((error) => {
        if (error instanceof BrowserLaunchError && error.code === "STARTUP_TIMEOUT") {
          return undefined;
        }
        throw error;
      });
    }

    if (launchError) {
      throw launchError;
    }

    return {
      cdpWsUrl,
      debuggingPort,
      process: browserProcess,
      browser: browserCandidate,
      extensionLoaded: Boolean(extensionPath)
    };
  } catch (error) {
    try {
      browserProcess.kill("SIGTERM");
    } catch {
      // Ignore shutdown failures during launch errors.
    }

    if (error instanceof BrowserLaunchError) {
      throw error;
    }

    throw new BrowserLaunchError("LAUNCH_FAILED", error instanceof Error ? error.message : String(error));
  } finally {
    browserProcess.off("error", onError);
    browserProcess.off("exit", onExit);
  }
}
