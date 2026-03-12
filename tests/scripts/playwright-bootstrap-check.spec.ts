import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  BOOTSTRAP_PROBE_PHASES,
  assertPlaywrightBootstrapReady,
  runPlaywrightBootstrapProbe,
  formatBootstrapFailureDetail,
  classifyPlaywrightBootstrapFailure,
  parseBootstrapFailureDetail
} from "../../scripts/lib/playwright-bootstrap-check.cjs";

describe("playwright bootstrap guard", () => {
  it("passes when playwright bootstrap probe succeeds", () => {
    expect(() =>
      assertPlaywrightBootstrapReady({
        timeoutMs: 50,
        runner: () => ({ ok: true, stdout: "ok", stderr: "" })
      })
    ).not.toThrow();
  });

  it("fails fast with timeout details when probe stalls", () => {
    expect(() =>
      assertPlaywrightBootstrapReady({
        timeoutMs: 50,
        runner: () => ({
          ok: false,
          phase: "load-playwright-core",
          code: "ETIMEDOUT",
          signal: "SIGTERM",
          message: "spawnSync node ETIMEDOUT",
          stdout: "",
          stderr: ""
        })
      })
    ).toThrow(/classification=runtime_bootstrap_timeout/);
  });

  it("includes stderr output for non-timeout failures", () => {
    expect(() =>
      assertPlaywrightBootstrapReady({
        timeoutMs: 50,
        runner: () => ({
          ok: false,
          phase: "load-playwright",
          code: "ERR_MODULE_NOT_FOUND",
          signal: undefined,
          message: "Cannot find module",
          stdout: "",
          stderr: "module missing"
        })
      })
    ).toThrow(/module missing/);
  });

  it("formats concise failure details", () => {
    const detail = formatBootstrapFailureDetail({
      ok: false,
      phase: "load-playwright",
      code: "ETIMEDOUT",
      signal: "SIGTERM",
      message: "spawnSync node ETIMEDOUT",
      stdout: "line1\nline2\nline3\nline4",
      stderr: "err1\nerr2\nerr3\nerr4"
    });

    expect(detail).toContain("phase=load-playwright");
    expect(detail).toContain("code=ETIMEDOUT");
    expect(detail).toContain("signal=SIGTERM");
    expect(detail).toContain("stdout=line1 | line2 | line3");
    expect(detail).toContain("stderr=err1 | err2 | err3");
  });

  it("reports the exact failing bootstrap phase", () => {
    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      phases: BOOTSTRAP_PROBE_PHASES,
      probeRunner: ({ script }) => {
        if (/playwright-core/.test(script)) {
          return {
            ok: false,
            code: "ETIMEDOUT",
            signal: "SIGTERM",
            message: "spawnSync node ETIMEDOUT",
            stdout: "",
            stderr: ""
          };
        }
        return { ok: true, stdout: "ok", stderr: "" };
      }
    });

    expect(result.ok).toBe(false);
    expect(result.phase).toBe("load-playwright-core");
  });

  it("retries a timeout failure once before failing the bootstrap phase", () => {
    const attemptsByScript = new Map<string, number>();
    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      phases: BOOTSTRAP_PROBE_PHASES,
      probeRunner: ({ script }) => {
        const currentAttempts = (attemptsByScript.get(script) ?? 0) + 1;
        attemptsByScript.set(script, currentAttempts);

        if (/playwright-core/.test(script) && currentAttempts === 1) {
          return {
            ok: false,
            code: "ETIMEDOUT",
            signal: "SIGTERM",
            message: "spawnSync node ETIMEDOUT",
            stdout: "",
            stderr: ""
          };
        }
        return { ok: true, stdout: "ok", stderr: "" };
      }
    });

    expect(result.ok).toBe(true);
    expect(attemptsByScript.get(BOOTSTRAP_PROBE_PHASES[0].script)).toBe(1);
    expect(attemptsByScript.get(BOOTSTRAP_PROBE_PHASES[1].script)).toBe(2);
    expect(attemptsByScript.get(BOOTSTRAP_PROBE_PHASES[2].script)).toBe(1);
  });

  it("does not retry non-timeout bootstrap failures", () => {
    let attempts = 0;
    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      phases: BOOTSTRAP_PROBE_PHASES,
      probeRunner: ({ script }) => {
        attempts += 1;
        if (/playwright-core/.test(script)) {
          return {
            ok: false,
            code: "ERR_MODULE_NOT_FOUND",
            signal: undefined,
            message: "Cannot find module playwright-core",
            stdout: "",
            stderr: "Cannot find module"
          };
        }
        return { ok: true, stdout: "ok", stderr: "" };
      }
    });

    expect(result.ok).toBe(false);
    expect(result.phase).toBe("load-playwright-core");
    expect(attempts).toBe(2);
  });

  it("classifies missing playwright dependency distinctly", () => {
    const classification = classifyPlaywrightBootstrapFailure({
      phase: "resolve-playwright",
      code: "MODULE_NOT_FOUND",
      message: "Cannot find module playwright"
    });
    expect(classification).toBe("runtime_bootstrap_dependency_missing");
  });

  it("parses detail into structured bootstrap classification", () => {
    const parsed = parseBootstrapFailureDetail(
      "phase=load-playwright-core; code=ETIMEDOUT; signal=SIGTERM; message=spawnSync node ETIMEDOUT"
    );
    expect(parsed.classification).toBe("runtime_bootstrap_timeout");
    expect(parsed.phase).toBe("load-playwright-core");
    expect(parsed.code).toBe("ETIMEDOUT");
    expect(parsed.signal).toBe("SIGTERM");
  });

  it("reuses a fresh cached bootstrap failure to fail fast", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "pw-bootstrap-cache-"));
    const cachePath = path.join(tmpDir, "cache", "playwright-bootstrap.json");
    mkdirSync(path.dirname(cachePath), { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: 1700000000000,
        result: {
          ok: false,
          phase: "load-playwright-core",
          code: "ETIMEDOUT",
          signal: "SIGTERM",
          message: "cached failure",
          stdout: "",
          stderr: "",
          classification: "runtime_bootstrap_timeout"
        }
      }),
      "utf8"
    );

    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      cachePath,
      cacheTtlMs: 60_000,
      nowMs: 1700000005000,
      probeRunner: () => ({ ok: true, stdout: "ok", stderr: "" })
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("ETIMEDOUT");
    expect(result.phase).toBe("load-playwright-core");
    expect(result.message).toContain("cached bootstrap failure");
  });

  it("ignores expired bootstrap cache and reruns probes", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "pw-bootstrap-cache-"));
    const cachePath = path.join(tmpDir, "cache", "playwright-bootstrap.json");
    mkdirSync(path.dirname(cachePath), { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: 1700000000000,
        result: {
          ok: false,
          phase: "load-playwright-core",
          code: "ETIMEDOUT",
          signal: "SIGTERM",
          message: "cached failure",
          stdout: "",
          stderr: "",
          classification: "runtime_bootstrap_timeout"
        }
      }),
      "utf8"
    );

    let calls = 0;
    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      cachePath,
      cacheTtlMs: 10,
      nowMs: 1700000015000,
      probeRunner: () => {
        calls += 1;
        return { ok: true, stdout: "ok", stderr: "" };
      }
    });

    expect(result.ok).toBe(true);
    expect(calls).toBe(BOOTSTRAP_PROBE_PHASES.length);
  });

  it("ignores fresh cached failures when runtime fingerprint mismatches", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "pw-bootstrap-cache-"));
    const cachePath = path.join(tmpDir, "cache", "playwright-bootstrap.json");
    mkdirSync(path.dirname(cachePath), { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: 1700000000000,
        fingerprint: {
          cwd: "/tmp/other-cwd",
          nodePath: "/tmp/other-node",
          nodeVersion: "v0.0.0"
        },
        result: {
          ok: false,
          phase: "load-playwright-core",
          code: "ETIMEDOUT",
          signal: "SIGTERM",
          message: "cached failure",
          stdout: "",
          stderr: "",
          classification: "runtime_bootstrap_timeout"
        }
      }),
      "utf8"
    );

    let calls = 0;
    const result = runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      cachePath,
      cacheTtlMs: 60_000,
      nowMs: 1700000005000,
      probeRunner: () => {
        calls += 1;
        return { ok: true, stdout: "ok", stderr: "" };
      }
    });

    expect(result.ok).toBe(true);
    expect(calls).toBe(BOOTSTRAP_PROBE_PHASES.length);
  });

  it("clears stale cache after a successful probe run", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "pw-bootstrap-cache-"));
    const cachePath = path.join(tmpDir, "cache", "playwright-bootstrap.json");
    mkdirSync(path.dirname(cachePath), { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: 1700000000000,
        result: {
          ok: false,
          phase: "load-playwright-core",
          code: "ETIMEDOUT",
          signal: "SIGTERM",
          message: "cached failure",
          stdout: "",
          stderr: "",
          classification: "runtime_bootstrap_timeout"
        }
      }),
      "utf8"
    );

    runPlaywrightBootstrapProbe({
      timeoutMs: 5_000,
      phaseTimeoutMs: 1_000,
      cachePath,
      cacheTtlMs: 10,
      nowMs: 1700000015000,
      probeRunner: () => ({ ok: true, stdout: "ok", stderr: "" })
    });

    const cacheText = readFileSync(cachePath, "utf8");
    const cache = JSON.parse(cacheText) as { result?: { ok?: boolean }; timestamp?: number };
    expect(cache.result?.ok).toBe(true);
    expect(cache.timestamp).toBe(1700000015000);
  });
});
