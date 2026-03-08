import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAccess = vi.hoisted(() => vi.fn());
const mockMkdir = vi.hoisted(() => vi.fn());
const mockMkdtemp = vi.hoisted(() => vi.fn());
const mockRealpath = vi.hoisted(() => vi.fn());
const mockOpenSync = vi.hoisted(() => vi.fn());
const mockCloseSync = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());
const mockSpawn = vi.hoisted(() => vi.fn());
const mockHomedir = vi.hoisted(() => vi.fn());
const mockTmpdir = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  access: mockAccess,
  mkdir: mockMkdir,
  mkdtemp: mockMkdtemp,
  realpath: mockRealpath,
  constants: {
    X_OK: 1,
    F_OK: 0
  }
}));

vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
  spawn: mockSpawn
}));

vi.mock("node:fs", () => ({
  openSync: mockOpenSync,
  closeSync: mockCloseSync
}));

vi.mock("node:os", () => ({
  homedir: mockHomedir,
  tmpdir: mockTmpdir
}));

import { BrowserLaunchError, discoverBrowserBinary, launchBrowser } from "../../sidecar/src/browser/launcher";

const ORIGINAL_PLATFORM = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform
  });
}

function createFakeChildProcess(): ChildProcess {
  const processLike = new EventEmitter() as ChildProcess;
  (processLike as ChildProcess & { pid?: number }).pid = 1337;
  (processLike as ChildProcess & { kill: (signal?: NodeJS.Signals | number) => boolean }).kill = vi
    .fn(() => true)
    .mockName("kill");
  return processLike;
}

afterEach(() => {
  setPlatform(ORIGINAL_PLATFORM);
  vi.unstubAllGlobals();
  mockAccess.mockReset();
  mockMkdir.mockReset();
  mockMkdtemp.mockReset();
  mockRealpath.mockReset();
  mockOpenSync.mockReset();
  mockCloseSync.mockReset();
  mockExecFile.mockReset();
  mockSpawn.mockReset();
  mockHomedir.mockReset();
  mockTmpdir.mockReset();
});

beforeEach(() => {
  mockHomedir.mockReturnValue("/Users/tester");
  mockTmpdir.mockReturnValue("/tmp");
  mockMkdir.mockResolvedValue(undefined);
  mockMkdtemp.mockResolvedValue("/tmp/new-browser-sidecar-123");
  mockRealpath.mockImplementation(async (value: string) => value);
  let nextFd = 40;
  mockOpenSync.mockImplementation(() => {
    nextFd += 1;
    return nextFd;
  });
  mockCloseSync.mockImplementation(() => undefined);
  mockAccess.mockRejectedValue(new Error("missing"));
  mockExecFile.mockImplementation(
    (
      _file: string,
      _args: string[],
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => {
      callback(new Error("not found"), "", "");
    }
  );
});

describe("browser launcher", () => {
  it("discovers macOS ungoogled Chromium binary at standard path", async () => {
    setPlatform("darwin");

    mockAccess.mockImplementation(async (pathLike: string) => {
      if (String(pathLike) === "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium") {
        return;
      }
      throw new Error("missing");
    });

    const discovered = await discoverBrowserBinary("ungoogled_only");

    expect(discovered).toBe("/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium");
  });

  it("treats ungoogled app path as ungoogled when realpath points to Chromium bundle", async () => {
    setPlatform("darwin");

    mockAccess.mockImplementation(async (pathLike: string) => {
      if (String(pathLike) === "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium") {
        return;
      }
      throw new Error("missing");
    });
    mockRealpath.mockResolvedValue("/Applications/Chromium.app/Contents/MacOS/Chromium");

    const discovered = await discoverBrowserBinary("ungoogled_only");

    expect(discovered).toBe("/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium");
  });

  it("discovers local ungoogled fallback path on macOS", async () => {
    setPlatform("darwin");

    mockAccess.mockImplementation(async (pathLike: string) => {
      if (String(pathLike) === "/Users/tester/.local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium") {
        return;
      }
      throw new Error("missing");
    });

    const discovered = await discoverBrowserBinary("ungoogled_only");

    expect(discovered).toBe("/Users/tester/.local/share/new-browser/ungoogled-chromium.app/Contents/MacOS/Chromium");
  });

  it("throws BINARY_NOT_FOUND when no browser exists", async () => {
    setPlatform("linux");

    mockExecFile.mockImplementation(
      (
        _file: string,
        _args: string[],
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(new Error("not found"), "", "");
      }
    );

    await expect(discoverBrowserBinary("ungoogled_only")).rejects.toMatchObject({
      name: "BrowserLaunchError",
      code: "BINARY_NOT_FOUND"
    } satisfies Partial<BrowserLaunchError>);
  });

  it("throws BINARY_POLICY_VIOLATION when override resolves to Chrome under ungoogled policy", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockRealpath.mockResolvedValue("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

    await expect(
      launchBrowser({
        binaryPath: "/Applications/ungoogled-chromium.app/Contents/MacOS/Chromium",
        requireExtension: false,
        browserPolicy: "ungoogled_only"
      })
    ).rejects.toMatchObject({
      name: "BrowserLaunchError",
      code: "BINARY_POLICY_VIOLATION"
    } satisfies Partial<BrowserLaunchError>);
  });

  it("returns cdpWsUrl after successful poll and passes extension args", async () => {
    setPlatform("linux");

    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    const cdpWsUrl = "ws://127.0.0.1:9222/devtools/browser/test";
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("booting"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ webSocketDebuggerUrl: cdpWsUrl }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const launched = await launchBrowser({
      binaryPath: "/tmp/chromium",
      debuggingPort: 9222,
      userDataDir: "/tmp/new-browser-profile",
      extensionPath: "/tmp/new-browser-extension",
      startupTimeoutMs: 500,
      pollIntervalMs: 1,
      browserPolicy: "any_chromium"
    });

    expect(launched.cdpWsUrl).toBe(cdpWsUrl);
    expect(launched.debuggingPort).toBe(9222);

    const call = mockSpawn.mock.calls[0];
    expect(call?.[0]).toBe("/tmp/chromium");
    expect(call?.[1]).toEqual(
      expect.arrayContaining([
        "--remote-debugging-port=9222",
        "--user-data-dir=/tmp/new-browser-profile",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch",
        "--disable-extensions-except=/tmp/new-browser-extension",
        "--load-extension=/tmp/new-browser-extension",
        "about:blank"
      ])
    );
    const spawnOptions = call?.[2] as { stdio?: unknown[] } | undefined;
    expect(Array.isArray(spawnOptions?.stdio)).toBe(true);
    expect(spawnOptions?.stdio?.[0]).toBe("ignore");
    expect(typeof spawnOptions?.stdio?.[1]).toBe("number");
    expect(typeof spawnOptions?.stdio?.[2]).toBe("number");
    expect(mockCloseSync).toHaveBeenCalledTimes(2);
  });

  it("merges extension-safe disable-features with caller-provided disable-features", async () => {
    setPlatform("linux");

    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/test" }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    await launchBrowser({
      binaryPath: "/tmp/chromium",
      userDataDir: "/tmp/new-browser-profile",
      extensionPath: "/tmp/new-browser-extension",
      startupTimeoutMs: 200,
      pollIntervalMs: 1,
      browserPolicy: "any_chromium",
      extraArgs: ["--disable-features=FooFeature"]
    });

    const call = mockSpawn.mock.calls.at(-1);
    expect(call?.[1]).toContain(
      "--disable-features=FooFeature,DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch"
    );
  });

  it("throws STARTUP_TIMEOUT when poll exceeds timeout", async () => {
    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    await expect(
      launchBrowser({
        binaryPath: "/tmp/chromium",
        debuggingPort: 9222,
        userDataDir: "/tmp/new-browser-profile",
        startupTimeoutMs: 20,
        pollIntervalMs: 5,
        requireExtension: false,
        browserPolicy: "any_chromium"
      })
    ).rejects.toMatchObject({
      name: "BrowserLaunchError",
      code: "STARTUP_TIMEOUT"
    } satisfies Partial<BrowserLaunchError>);

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect((fakeProcess.kill as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("SIGTERM");
  });

  it("throws EXTENSION_REQUIRED_MISSING when extension path is required but missing", async () => {
    mockAccess.mockResolvedValue(undefined);

    await expect(
      launchBrowser({
        binaryPath: "/tmp/chromium",
        requireExtension: true,
        browserPolicy: "any_chromium"
      })
    ).rejects.toMatchObject({
      name: "BrowserLaunchError",
      code: "EXTENSION_REQUIRED_MISSING"
    } satisfies Partial<BrowserLaunchError>);
  });

  it("uses the persistent assistant profile when no user data dir is provided", async () => {
    setPlatform("darwin");

    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/test" }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    await launchBrowser({
      binaryPath: "/tmp/chromium",
      extensionPath: "/tmp/new-browser-extension",
      startupTimeoutMs: 200,
      pollIntervalMs: 1,
      browserPolicy: "any_chromium"
    });

    expect(mockMkdir).toHaveBeenCalledWith("/Users/tester/.local/share/new-browser/chrome-profile", { recursive: true });
    const call = mockSpawn.mock.calls.at(-1);
    expect(call?.[1]).toEqual(
      expect.arrayContaining(["--user-data-dir=/Users/tester/.local/share/new-browser/chrome-profile"])
    );
  });

  it("uses direct spawn with redirected logs on macOS launch", async () => {
    setPlatform("darwin");

    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/test" }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    await launchBrowser({
      binaryPath: "/tmp/chromium",
      userDataDir: "/tmp/new-browser-profile",
      extensionPath: "/tmp/new-browser-extension",
      startupTimeoutMs: 200,
      pollIntervalMs: 1,
      browserPolicy: "any_chromium"
    });

    const call = mockSpawn.mock.calls.at(-1);
    expect(call?.[0]).toBe("/tmp/chromium");
    expect(call?.[1]).toEqual(
      expect.arrayContaining(["--enable-logging=stderr", "--v=1", "about:blank"])
    );
    const spawnOptions = call?.[2] as { stdio?: unknown[] } | undefined;
    expect(Array.isArray(spawnOptions?.stdio)).toBe(true);
    expect(spawnOptions?.stdio?.[0]).toBe("ignore");
    expect(typeof spawnOptions?.stdio?.[1]).toBe("number");
    expect(typeof spawnOptions?.stdio?.[2]).toBe("number");
  });

  it("creates an explicit user data dir before launch", async () => {
    const fakeProcess = createFakeChildProcess();
    mockSpawn.mockReturnValue(fakeProcess);
    mockAccess.mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/test" }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      )
    );

    await launchBrowser({
      binaryPath: "/tmp/chromium",
      userDataDir: "/tmp/explicit-profile",
      requireExtension: false,
      startupTimeoutMs: 200,
      pollIntervalMs: 1,
      browserPolicy: "any_chromium"
    });

    expect(mockMkdir).toHaveBeenCalledWith("/tmp/explicit-profile", { recursive: true });
  });
});
