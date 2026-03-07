import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSION_MANIFEST = path.join(ROOT, "extension", "manifest.json");
const NPM_BIN = process.platform === "win32" ? "npm.cmd" : "npm";
const STARTUP_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 250;

const childProcesses = [];
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForFile(filePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    try {
      await access(filePath, constants.F_OK);
      return;
    } catch {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  throw new Error(`Timed out waiting for build output: ${filePath}`);
}

function terminateChildren(signal) {
  for (const child of childProcesses) {
    if (!child.killed) {
      try {
        child.kill(signal);
      } catch {
        // Ignore cleanup failures during shutdown.
      }
    }
  }
}

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminateChildren(signal);
  process.exitCode = exitCode;
}

function spawnNpm(args, label) {
  const child = spawn(NPM_BIN, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env
  });

  childProcesses.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = typeof code === "number" && code !== 0 ? code : 1;
    console.error(`${label} exited unexpectedly.`);
    shutdown(signal ?? "SIGTERM", exitCode);
  });

  return child;
}

process.on("SIGINT", () => shutdown("SIGINT", 130));
process.on("SIGTERM", () => shutdown("SIGTERM", 143));

async function main() {
  await waitForFile(EXTENSION_MANIFEST, STARTUP_TIMEOUT_MS);
  spawnNpm(["start"], "sidecar runtime");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown("SIGTERM", 1);
});
