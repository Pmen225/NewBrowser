import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildLiveRunReport,
  buildSetActiveTabPayload,
  ensureSidecarRuntimeReady,
  isMissingSessionError,
  isMissingTargetError,
  prepareLiveRunOutputDir,
  resolveConfiguredExtensionId,
  startManagedSidecarProcess,
  validateLiveRunPrompt,
  withRecoveredSession
} from "../../scripts/live-cdp-panel-check.mjs";

describe("live CDP panel helper", () => {
  it("omits chrome_tab_id from SetActiveTab payload when it could not be resolved", () => {
    expect(
      buildSetActiveTabPayload({
        chromeTabId: undefined,
        targetId: "target-loopback",
        url: "http://127.0.0.1:4317/upload",
        title: "Upload"
      })
    ).toEqual({
      target_id: "target-loopback",
      url: "http://127.0.0.1:4317/upload",
      title: "Upload"
    });
  });

  it("omits empty optional SetActiveTab metadata", () => {
    expect(
      buildSetActiveTabPayload({
        chromeTabId: 71456237,
        targetId: "target-loopback",
        url: "http://127.0.0.1:4317/upload",
        title: ""
      })
    ).toEqual({
      chrome_tab_id: 71456237,
      target_id: "target-loopback",
      url: "http://127.0.0.1:4317/upload"
    });
  });

  it("detects missing-session errors", () => {
    expect(isMissingSessionError(new Error("[Runtime.evaluate] Session with given id not found"))).toBe(true);
    expect(isMissingSessionError(new Error("other failure"))).toBe(false);
  });

  it("detects missing-target errors", () => {
    expect(isMissingTargetError(new Error("[Target.attachToTarget] No target with given id found"))).toBe(true);
    expect(isMissingTargetError(new Error("other failure"))).toBe(false);
  });

  it("rejects an empty live prompt before treating qa:trace as a real run", () => {
    expect(() => validateLiveRunPrompt("")).toThrow(/LIVE_PROMPT/i);
    expect(() => validateLiveRunPrompt("Check the page heading")).not.toThrow();
  });

  it("clears stale live-run artefacts when reusing an output directory", () => {
    const sandbox = path.join(tmpdir(), `live-cdp-panel-output-${Date.now()}`);
    const outputDir = path.join(sandbox, "output");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, "report.json"), "{\"stale\":true}");
    writeFileSync(path.join(outputDir, "panel-final.png"), "stale");
    writeFileSync(path.join(outputDir, "site-final.png"), "stale");

    prepareLiveRunOutputDir(outputDir);

    expect(existsSync(outputDir)).toBe(true);
    expect(readdirSync(outputDir)).toEqual([]);
  });

  it("includes run id and failure status in live-run reports", () => {
    const report = buildLiveRunReport({
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock",
      extensionId: "ext-1",
      targetUrl: "https://example.com",
      prompt: "Find the page heading",
      provider: "google",
      modelId: "models/gemini-2.5-flash",
      elapsedMs: 1234,
      runId: "run-123",
      status: "failed",
      panel: { assistantText: "Working", stopMode: true, toasts: [], actionItems: [], sources: [] },
      site: { url: "https://example.com", title: "Example", heading: "Example Domain", uploaded: "" },
      siteEval: { heading: "Example Domain" },
      error: { message: "Timed out waiting for assistant result", name: "TimeoutError" }
    });

    expect(report).toEqual(expect.objectContaining({
      runId: "run-123",
      status: "failed",
      error: {
        message: "Timed out waiting for assistant result",
        name: "TimeoutError"
      }
    }));
  });

  it("reattaches to the same target when the original session is gone", async () => {
    const sendCalls = [];
    const cdp = {
      async send(method, params = {}, sessionId) {
        sendCalls.push({ method, params, sessionId });
        if (method === "Target.attachToTarget") {
          return { sessionId: "session-2" };
        }
        return {};
      }
    };
    const target = {
      targetId: "target-1",
      sessionId: "session-1"
    };
    let attempts = 0;

    const result = await withRecoveredSession(cdp, target, async (sessionId) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(`[Runtime.evaluate] Session with given id not found: ${sessionId}`);
      }
      return { sessionId };
    });

    expect(result).toEqual({ sessionId: "session-2" });
    expect(target.sessionId).toBe("session-2");
    expect(sendCalls).toEqual([
      {
        method: "Target.attachToTarget",
        params: { targetId: "target-1", flatten: true },
        sessionId: undefined
      },
      {
        method: "Page.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "DOM.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "Runtime.enable",
        params: {},
        sessionId: "session-2"
      },
      {
        method: "Network.enable",
        params: {},
        sessionId: "session-2"
      }
    ]);
  });

  it("re-resolves the target when the original target id is stale", async () => {
    const sendCalls = [];
    const cdp = {
      async send(method, params = {}, sessionId) {
        sendCalls.push({ method, params, sessionId });
        if (method === "Target.getTargets") {
          return {
            targetInfos: [
              {
                targetId: "target-2",
                type: "page",
                url: "https://the-internet.herokuapp.com/javascript_alerts"
              }
            ]
          };
        }
        if (method === "Target.attachToTarget") {
          if (params.targetId === "target-1") {
            throw new Error("[Target.attachToTarget] No target with given id found");
          }
          return { sessionId: "session-2" };
        }
        return {};
      }
    };
    const target = {
      targetId: "target-1",
      sessionId: "session-1",
      type: "page",
      matchUrl: "https://the-internet.herokuapp.com/javascript_alerts"
    };
    let attempts = 0;

    const result = await withRecoveredSession(cdp, target, async (sessionId) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error(`[Runtime.evaluate] Session with given id not found: ${sessionId}`);
      }
      return { sessionId, targetId: target.targetId };
    });

    expect(result).toEqual({ sessionId: "session-2", targetId: "target-2" });
    expect(target.sessionId).toBe("session-2");
    expect(target.targetId).toBe("target-2");
    expect(sendCalls).toContainEqual({
      method: "Target.getTargets",
      params: {},
      sessionId: undefined
    });
    expect(sendCalls).toContainEqual({
      method: "Target.attachToTarget",
      params: { targetId: "target-2", flatten: true },
      sessionId: undefined
    });
  });

  it("resolves the extension id by manifest signature when the loaded profile points at another checkout", () => {
    const sandbox = path.join(tmpdir(), `live-cdp-panel-check-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    const currentRoot = path.join(sandbox, "current");
    const installedRoot = path.join(sandbox, "installed");
    const profileRoot = path.join(sandbox, "profile");
    mkdirSync(path.join(currentRoot, "extension"), { recursive: true });
    mkdirSync(path.join(installedRoot, "extension"), { recursive: true });
    mkdirSync(path.join(profileRoot, "Default"), { recursive: true });

    const manifest = {
      manifest_version: 3,
      name: "Assistant",
      version: "0.2.0",
      description: "BrowserOS assistant shell wired to the local sidecar"
    };
    writeFileSync(path.join(currentRoot, "extension", "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(installedRoot, "extension", "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(
      path.join(profileRoot, "Default", "Secure Preferences"),
      JSON.stringify({
        extensions: {
          settings: {
            "assistant-extension-id": {
              path: path.join(installedRoot, "extension")
            }
          }
        }
      }, null, 2)
    );

    expect(resolveConfiguredExtensionId({
      root: currentRoot,
      profileRoot
    })).toBe("assistant-extension-id");
  });

  it("checks sidecar runtime readiness before the rpc phase", async () => {
    const fetchImpl = async () => ({
      ok: true,
      async json() {
        return {
          ok: true,
          mode: "ping_only",
          extension_loaded: false,
          tabs: []
        };
      }
    });

    await expect(ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      fetchImpl
    })).rejects.toThrow(/runtime-ready/i);
  });

  it("attempts managed sidecar recovery when sidecar is unreachable", async () => {
    const spawnCalls: string[] = [];
    const managedPayload = {
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: [{ id: "tab-1" }]
    };
    const managedSidecar = {
      once: () => undefined
    };

    const result = await ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      startManagedSidecar: ({ cdpWsUrl }) => {
        spawnCalls.push(cdpWsUrl);
        return managedSidecar;
      },
      waitForManagedRuntimeReadiness: async () => managedPayload,
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    });

    expect(spawnCalls).toEqual(["ws://127.0.0.1:9555/devtools/browser/mock"]);
    expect(result.payload).toEqual(managedPayload);
    expect(result.recoveredByManagedStart).toBe(true);
    expect(result.managedSidecarProcess).toBe(managedSidecar);
  });

  it("starts managed sidecar recovery with the resolved local esbuild bundle command and injected CDP url", async () => {
    const sandbox = path.join(tmpdir(), `managed-sidecar-spawn-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    mkdirSync(path.join(sandbox, "node_modules", "esbuild", "lib"), { recursive: true });
    mkdirSync(path.join(sandbox, "sidecar", "src"), { recursive: true });
    writeFileSync(path.join(sandbox, "node_modules", "esbuild", "lib", "main.js"), "");
    writeFileSync(path.join(sandbox, "sidecar", "src", "server.ts"), "");

    const spawnCalls = [];
    const buildCalls = [];
    const processHandle = {
      once: () => undefined,
      stdout: { on: () => undefined },
      stderr: { on: () => undefined }
    };

    const result = await startManagedSidecarProcess({
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock",
      root: sandbox,
      buildImpl: async (options) => {
        buildCalls.push(options);
        writeFileSync(options.outfile, "// bundled");
      },
      baseEnv: {
        KEEP_ME: "1",
        npm_config_user_agent: "npm",
        npx_test_flag: "1",
        _: "/usr/bin/npm"
      },
      spawnImpl: (...args) => {
        spawnCalls.push(args);
        return processHandle;
      }
    });

    expect(result).toBe(processHandle);
    expect(buildCalls).toEqual([
      expect.objectContaining({
        entryPoints: [path.join(sandbox, "sidecar", "src", "server.ts")],
        bundle: true,
        platform: "node",
        format: "cjs"
      })
    ]);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0][0]).toBe(process.execPath);
    expect(spawnCalls[0][1]).toHaveLength(1);
    expect(spawnCalls[0][1][0]).toMatch(/server\.cjs$/);
    expect(spawnCalls[0][2]).toMatchObject({
      cwd: sandbox,
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(spawnCalls[0][2].env.CHROME_CDP_WS_URL).toBe("ws://127.0.0.1:9555/devtools/browser/mock");
    expect(typeof spawnCalls[0][2].env.SIDECAR_STARTUP_STATE_PATH).toBe("string");
    expect(spawnCalls[0][2].env.SIDECAR_STARTUP_STATE_PATH).toContain("startup-state.json");
    expect(spawnCalls[0][2].env.KEEP_ME).toBe("1");
    expect(spawnCalls[0][2].env.npm_config_user_agent).toBeUndefined();
    expect(spawnCalls[0][2].env.npx_test_flag).toBeUndefined();
    expect(spawnCalls[0][2].env._).toBeUndefined();
    expect(result.managedStdoutPath).toContain("managed-sidecar.stdout.log");
    expect(result.managedStderrPath).toContain("managed-sidecar.stderr.log");
  });

  it("does not start managed sidecar when runtime endpoint is reachable but not ready", async () => {
    await expect(ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      waitForRuntimeReadiness: async () => {
        const error = new Error("mode:ping_only");
        error.reachable = true;
        throw error;
      },
      startManagedSidecar: () => {
        throw new Error("should not be called");
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    })).rejects.toThrow(/mode:ping_only/i);
  });

  it("fails with loopback bind classification when runtime is unreachable and loopback preflight is blocked", async () => {
    await expect(ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      assertLoopbackReady: async () => {
        throw new Error("loopback bind preflight failed; classification=loopback_bind_permission_failure; code=EPERM");
      },
      startManagedSidecar: () => {
        throw new Error("should not be called");
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    })).rejects.toThrow(/loopback_bind_permission_failure/i);
  });

  it("wraps managed recovery timeouts with a startup-specific classification", async () => {
    const sandbox = path.join(tmpdir(), `managed-sidecar-state-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    const startupStatePath = path.join(sandbox, "startup-state.json");
    writeFileSync(startupStatePath, JSON.stringify({
      phase: "prompt_specs_loaded",
      detail: "before_transport_connect"
    }));

    await expect(ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      startManagedSidecar: () => ({
        once: () => undefined,
        startupStatePath
      }),
      waitForManagedRuntimeReadiness: async () => {
        throw new Error("Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 5ms (fetch failed).");
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    })).rejects.toMatchObject({
      code: "SIDECAR_RUNTIME_MANAGED_START_FAILED",
      reachable: false,
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock",
      startupPhase: "prompt_specs_loaded",
      startupPhaseDetail: "before_transport_connect",
      startupStatePath
    });
  });

  it("marks startup phase as not emitted when the managed child never writes telemetry", async () => {
    const sandbox = path.join(tmpdir(), `managed-sidecar-state-missing-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    const startupStatePath = path.join(sandbox, "startup-state.json");

    await expect(ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      startManagedSidecar: () => ({
        once: () => undefined,
        startupStatePath,
        managedStdoutPath: path.join(sandbox, "managed-sidecar.stdout.log"),
        managedStderrPath: path.join(sandbox, "managed-sidecar.stderr.log")
      }),
      waitForManagedRuntimeReadiness: async () => {
        throw new Error("Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 5ms (fetch failed).");
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    })).rejects.toMatchObject({
      code: "SIDECAR_RUNTIME_MANAGED_START_FAILED",
      startupPhase: "not_emitted",
      startupStatePath,
      managedStdoutPath: path.join(sandbox, "managed-sidecar.stdout.log"),
      managedStderrPath: path.join(sandbox, "managed-sidecar.stderr.log")
    });
  });

  it("recovers when managed spawn loses to an already-running sidecar on the same port", async () => {
    const payload = {
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: [{ id: "tab-1" }]
    };
    let runtimeChecks = 0;

    const result = await ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        runtimeChecks += 1;
        if (runtimeChecks === 1) {
          const error = new Error("fetch failed");
          error.reachable = false;
          throw error;
        }
        return payload;
      },
      startManagedSidecar: () => ({
        once: () => undefined,
        managedStdoutPath: "/tmp/managed-sidecar.stdout.log",
        managedStderrPath: "/tmp/managed-sidecar.stderr.log"
      }),
      waitForManagedRuntimeReadiness: async () => {
        const error = new Error(
          "Assistant sidecar exited before it became runtime-ready at http://127.0.0.1:3210/health (code=1 signal=null; lastReason=unreachable)."
        );
        error.code = "SIDECAR_RUNTIME_EXITED";
        error.reachable = false;
        throw error;
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    });

    expect(runtimeChecks).toBe(2);
    expect(result).toEqual(expect.objectContaining({
      payload,
      healthUrl: "http://127.0.0.1:3210/health",
      recoveredByManagedStart: false,
      recoveredByExistingRuntime: true
    }));
  });

  it("retries managed startup once when the first managed attempt fails silently before emitting evidence", async () => {
    const sandbox = path.join(tmpdir(), `managed-sidecar-silent-retry-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    const firstStdoutPath = path.join(sandbox, "first.stdout.log");
    const firstStderrPath = path.join(sandbox, "first.stderr.log");
    const secondStdoutPath = path.join(sandbox, "second.stdout.log");
    const secondStderrPath = path.join(sandbox, "second.stderr.log");
    writeFileSync(firstStdoutPath, "");
    writeFileSync(firstStderrPath, "");
    writeFileSync(secondStdoutPath, "");
    writeFileSync(secondStderrPath, "");

    const firstHandle = {
      once: () => undefined,
      kill: () => undefined,
      startupStatePath: path.join(sandbox, "missing-startup-state.json"),
      managedStdoutPath: firstStdoutPath,
      managedStderrPath: firstStderrPath
    };
    const secondHandle = {
      once: () => undefined,
      kill: () => undefined,
      startupStatePath: path.join(sandbox, "second-startup-state.json"),
      managedStdoutPath: secondStdoutPath,
      managedStderrPath: secondStderrPath
    };
    const managedPayload = {
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: [{ id: "tab-1" }]
    };
    const spawnedHandles = [];

    const result = await ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      startManagedSidecar: () => {
        const handle = spawnedHandles.length === 0 ? firstHandle : secondHandle;
        spawnedHandles.push(handle);
        return handle;
      },
      waitForManagedRuntimeReadiness: async ({ serverProcess }) => {
        if (serverProcess === firstHandle) {
          throw new Error("Assistant sidecar did not become runtime-ready at http://127.0.0.1:3210/health within 5ms (fetch failed).");
        }
        return managedPayload;
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    });

    expect(spawnedHandles).toEqual([firstHandle, secondHandle]);
    expect(result.payload).toEqual(managedPayload);
    expect(result.recoveredByManagedStart).toBe(true);
    expect(result.managedSidecarProcess).toBe(secondHandle);
  });

  it("retries managed startup once when the first managed attempt exits with a transient tsx loader ECANCELED error", async () => {
    const sandbox = path.join(tmpdir(), `managed-sidecar-loader-retry-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    const firstStdoutPath = path.join(sandbox, "first.stdout.log");
    const firstStderrPath = path.join(sandbox, "first.stderr.log");
    const secondStdoutPath = path.join(sandbox, "second.stdout.log");
    const secondStderrPath = path.join(sandbox, "second.stderr.log");
    writeFileSync(firstStdoutPath, "");
    writeFileSync(
      firstStderrPath,
      "Error: ECANCELED: operation canceled, read\n    at async load (file:///repo/node_modules/tsx/dist/esm/index.mjs:2:1771)"
    );
    writeFileSync(secondStdoutPath, "");
    writeFileSync(secondStderrPath, "");

    const firstHandle = {
      once: () => undefined,
      kill: () => undefined,
      startupStatePath: path.join(sandbox, "missing-startup-state.json"),
      managedStdoutPath: firstStdoutPath,
      managedStderrPath: firstStderrPath,
      exitCode: 1,
      signalCode: null
    };
    const secondHandle = {
      once: () => undefined,
      kill: () => undefined,
      startupStatePath: path.join(sandbox, "second-startup-state.json"),
      managedStdoutPath: secondStdoutPath,
      managedStderrPath: secondStderrPath,
      exitCode: null,
      signalCode: null
    };
    const managedPayload = {
      ok: true,
      mode: "cdp",
      extension_loaded: true,
      tabs: [{ id: "tab-1" }]
    };
    const spawnedHandles = [];

    const result = await ensureSidecarRuntimeReady({
      rpcUrl: "ws://127.0.0.1:3210/rpc",
      timeoutMs: 5,
      pollMs: 1,
      assertLoopbackReady: async () => undefined,
      waitForRuntimeReadiness: async () => {
        const error = new Error("fetch failed");
        error.reachable = false;
        throw error;
      },
      startManagedSidecar: () => {
        const handle = spawnedHandles.length === 0 ? firstHandle : secondHandle;
        spawnedHandles.push(handle);
        return handle;
      },
      waitForManagedRuntimeReadiness: async ({ serverProcess }) => {
        if (serverProcess === firstHandle) {
          const error = new Error(
            "Assistant sidecar exited before it became runtime-ready at http://127.0.0.1:3210/health (code=1 signal=null; lastReason=unreachable)."
          );
          error.code = "SIDECAR_RUNTIME_EXITED";
          error.reachable = false;
          throw error;
        }
        return managedPayload;
      },
      cdpWsUrl: "ws://127.0.0.1:9555/devtools/browser/mock"
    });

    expect(spawnedHandles).toEqual([firstHandle, secondHandle]);
    expect(result.payload).toEqual(managedPayload);
    expect(result.managedStartAttemptCount).toBe(2);
    expect(result.recoveredByManagedStart).toBe(true);
  });
});
