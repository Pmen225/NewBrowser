import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function resolveSidecarEntrypoint(root) {
  return path.join(root, "sidecar", "src", "server.ts");
}

function resolveLocalEsbuildModulePath(root) {
  const localEsbuildModulePath = path.join(root, "node_modules", "esbuild", "lib", "main.js");
  return existsSync(localEsbuildModulePath) ? localEsbuildModulePath : null;
}

async function resolveEsbuildBuild({ root, buildImpl }) {
  if (typeof buildImpl === "function") {
    return buildImpl;
  }

  const localEsbuildModulePath = resolveLocalEsbuildModulePath(root);
  if (!localEsbuildModulePath) {
    return null;
  }

  const esbuildModule = await import(pathToFileURL(localEsbuildModulePath).href);
  return typeof esbuildModule.build === "function" ? esbuildModule.build : null;
}

export async function prepareSidecarLaunchCommand({
  root = process.cwd(),
  buildImpl,
  tempRoot = tmpdir()
} = {}) {
  const build = await resolveEsbuildBuild({ root, buildImpl });
  const sidecarEntrypoint = resolveSidecarEntrypoint(root);

  if (!build) {
    return resolveSidecarLaunchCommand({ root });
  }

  const bundleDir = mkdtempSync(path.join(tempRoot, "newbrowser-sidecar-bundle-"));
  const bundlePath = path.join(bundleDir, "server.cjs");

  await build({
    entryPoints: [sidecarEntrypoint],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundlePath,
    logLevel: "silent"
  });

  return {
    command: process.execPath,
    args: [bundlePath],
    mode: "esbuild_bundle_local_cjs",
    bundlePath,
    bundleDir
  };
}

export function cleanupPreparedSidecarLaunchCommand(launch) {
  if (typeof launch?.bundleDir !== "string" || launch.bundleDir.trim().length === 0) {
    return;
  }

  try {
    rmSync(launch.bundleDir, { recursive: true, force: true });
  } catch {
    // Ignore temp bundle cleanup failures.
  }
}

export function resolveSidecarLaunchCommand({ root = process.cwd() } = {}) {
  const localTsxPath = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  const sidecarEntrypoint = resolveSidecarEntrypoint(root);

  if (existsSync(localTsxPath)) {
    return {
      command: process.execPath,
      args: ["--import", "tsx/esm", sidecarEntrypoint],
      mode: "node_import_local_tsx"
    };
  }

  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["--yes", "tsx", sidecarEntrypoint],
    mode: "npx_fallback"
  };
}
