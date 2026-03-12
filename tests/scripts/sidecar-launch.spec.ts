import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import {
  prepareSidecarLaunchCommand,
  resolveSidecarLaunchCommand
} from "../../scripts/lib/sidecar-launch.js";

describe("sidecar launch command resolution", () => {
  it("prepares a local esbuild CommonJS bundle when esbuild is available", async () => {
    const sandbox = path.join(tmpdir(), `sidecar-launch-bundle-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    mkdirSync(path.join(sandbox, "node_modules", "esbuild", "lib"), { recursive: true });
    mkdirSync(path.join(sandbox, "sidecar", "src"), { recursive: true });
    writeFileSync(path.join(sandbox, "node_modules", "esbuild", "lib", "main.js"), "");
    writeFileSync(path.join(sandbox, "sidecar", "src", "server.ts"), "console.log('hello');");

    const buildCalls = [];
    const launch = await prepareSidecarLaunchCommand({
      root: sandbox,
      buildImpl: async (options) => {
        buildCalls.push(options);
        writeFileSync(options.outfile, "// bundled");
      }
    });

    expect(launch.command).toBe(process.execPath);
    expect(launch.mode).toBe("esbuild_bundle_local_cjs");
    expect(launch.args).toHaveLength(1);
    expect(launch.args[0]).toMatch(/server\.cjs$/);
    expect(readFileSync(launch.args[0], "utf8")).toBe("// bundled");
    expect(buildCalls).toEqual([
      expect.objectContaining({
        entryPoints: [path.join(sandbox, "sidecar", "src", "server.ts")],
        bundle: true,
        platform: "node",
        format: "cjs",
        outfile: launch.args[0]
      })
    ]);
  });

  it("prefers node --import tsx/esm when repo-local tsx is installed", () => {
    const sandbox = path.join(tmpdir(), `sidecar-launch-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    mkdirSync(path.join(sandbox, "node_modules", ".bin"), { recursive: true });
    mkdirSync(path.join(sandbox, "sidecar", "src"), { recursive: true });
    writeFileSync(path.join(sandbox, "node_modules", ".bin", "tsx"), "");
    writeFileSync(path.join(sandbox, "sidecar", "src", "server.ts"), "");

    expect(resolveSidecarLaunchCommand({ root: sandbox })).toEqual({
      command: process.execPath,
      args: ["--import", "tsx/esm", path.join(sandbox, "sidecar", "src", "server.ts")],
      mode: "node_import_local_tsx"
    });
  });

  it("falls back to npx when repo-local tsx is absent", () => {
    const sandbox = path.join(tmpdir(), `sidecar-launch-fallback-${Date.now()}`);
    mkdirSync(sandbox, { recursive: true });
    mkdirSync(path.join(sandbox, "sidecar", "src"), { recursive: true });
    writeFileSync(path.join(sandbox, "sidecar", "src", "server.ts"), "");

    expect(resolveSidecarLaunchCommand({ root: sandbox })).toEqual({
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["--yes", "tsx", path.join(sandbox, "sidecar", "src", "server.ts")],
      mode: "npx_fallback"
    });
  });
});
