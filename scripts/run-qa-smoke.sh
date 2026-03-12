#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const process = require("node:process");
const { waitForSidecarRuntimeReadiness, DEFAULT_SMOKE_HEALTH_URL } = require("./scripts/lib/qa-smoke-runtime.cjs");
const { assertPlaywrightBootstrapReady } = require("./scripts/lib/playwright-bootstrap-check.cjs");

const ROOT = process.cwd();
const EXTENSION_PATH = path.join(ROOT, "extension");
const OUTPUT_DIR = path.join(ROOT, "output", "playwright", "qa-smoke");

function withTimeout(label, promise, timeoutMs = 10_000) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

async function resolveExtensionId(context, timeoutMs = 10_000) {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: timeoutMs });
  }

  const extensionId = serviceWorker.url().split("/")[2];
  if (!extensionId) {
    throw new Error("Unable to resolve extension id");
  }
  return extensionId;
}

async function safeScreenshot(page, filePath) {
  if (!page) {
    return;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    await page.screenshot({ path: filePath });
  } catch {
    // Best-effort debug capture.
  }
}

async function main() {
  console.log("qa-smoke: starting");
  if (!existsSync(path.join(EXTENSION_PATH, "manifest.json"))) {
    throw new Error("Missing extension/manifest.json");
  }

  console.log("qa-smoke: loading playwright-core");
  assertPlaywrightBootstrapReady({
    timeoutMs: 15_000
  });
  const { chromium } = require("playwright");
  console.log("qa-smoke: playwright-core loaded");

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const profileDir = mkdtempSync(path.join(tmpdir(), "new-browser-qa-smoke-profile-"));
  const extensionDir = mkdtempSync(path.join(tmpdir(), "new-browser-qa-smoke-extension-"));
  cpSync(EXTENSION_PATH, extensionDir, { recursive: true });

  let context = null;
  let panel = null;

  try {
    const healthUrl = process.env.NEW_BROWSER_QA_HEALTH_URL || process.env.SIDECAR_HEALTH_URL || DEFAULT_SMOKE_HEALTH_URL;
    console.log(`qa-smoke: waiting for sidecar health at ${healthUrl}`);
    await waitForSidecarRuntimeReadiness({
      healthUrl,
      timeoutMs: 12_000,
      pollMs: 250,
      requireTabs: false
    });
    console.log("qa-smoke: sidecar preflight ready");

    context = await withTimeout(
      "launchPersistentContext",
      chromium.launchPersistentContext(profileDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionDir}`,
          `--load-extension=${extensionDir}`
        ]
      }),
      15_000
    );
    console.log("qa-smoke: browser launched");

    const extensionId = await resolveExtensionId(context, 10_000);
    console.log("qa-smoke: extension resolved");

    const webPage = await context.newPage();
    await withTimeout("target goto", webPage.goto("https://example.com", { waitUntil: "domcontentloaded" }), 10_000);
    console.log("qa-smoke: target ready");

    panel = await context.newPage();
    await withTimeout("panel goto", panel.goto(`chrome-extension://${extensionId}/panel.html`), 10_000);
    await panel.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8_000 });
    console.log("qa-smoke: panel ready");

    await waitForSidecarRuntimeReadiness({
      healthUrl,
      timeoutMs: 8_000,
      pollMs: 250
    });
    console.log("qa-smoke: sidecar attached tabs ready");

    await panel.locator("#btn-plus").click();
    const screenshotButton = panel.locator("#plus-screenshot");
    await screenshotButton.waitFor({ state: "visible", timeout: 5_000 });
    await screenshotButton.click();

    const attachmentChip = panel.locator(".attachment-chip").first();
    const successToast = panel.locator(".toast:not(.error)").first();
    const errorToast = panel.locator(".toast.error").first();

    const outcome = await Promise.race([
      attachmentChip.waitFor({ state: "visible", timeout: 8_000 }).then(() => "attachment-chip"),
      successToast.waitFor({ state: "visible", timeout: 8_000 }).then(() => "success-toast"),
      errorToast.waitFor({ state: "visible", timeout: 8_000 }).then(() => "error-toast")
    ]).catch(() => "timeout");
    console.log(`qa-smoke: outcome=${outcome}`);

    const screenshotPath = path.join(OUTPUT_DIR, "panel-final.png");
    await safeScreenshot(panel, screenshotPath);

    if (outcome === "error-toast") {
      const toastText = await errorToast.textContent().catch(() => "unknown");
      throw new Error(`Screenshot failed in UI: ${toastText}`);
    }

    if (outcome === "timeout") {
      const state = await panel.evaluate(() => ({
        chips: document.querySelectorAll(".attachment-chip").length,
        toasts: Array.from(document.querySelectorAll(".toast")).map((node) => node.textContent?.trim() ?? ""),
        attachmentPreviewHidden: document.getElementById("attachment-preview")?.hasAttribute("hidden") ?? true
      }));
      throw new Error(`Timed out waiting for screenshot result: ${JSON.stringify(state)}`);
    }

    await attachmentChip.waitFor({ state: "visible", timeout: 3_000 });
    const chipText = (await panel.locator(".attach-name").first().textContent())?.trim() ?? "";
    if (!/screenshot/i.test(chipText)) {
      throw new Error(`Unexpected attachment chip text: ${chipText}`);
    }

    const panelConnectivityState = await panel.evaluate(() => {
      const connBar = document.getElementById("conn-bar");
      const connLabel = document.getElementById("conn-label");
      const emptyTitle = document.querySelector("#empty-state .empty-title");
      const reconnectButton = document.getElementById("empty-reconnect-btn");
      const labelText = connLabel?.textContent?.trim() ?? "";
      const titleText = emptyTitle?.textContent?.trim() ?? "";
      return {
        connBarHidden: connBar?.hasAttribute("hidden") ?? true,
        connLabel: labelText,
        emptyTitle: titleText,
        reconnectVisible: reconnectButton ? !reconnectButton.hasAttribute("hidden") : false
      };
    });
    const hasOfflineSignal =
      panelConnectivityState.reconnectVisible ||
      /offline|reconnecting/i.test(panelConnectivityState.connLabel) ||
      /offline|reconnecting/i.test(panelConnectivityState.emptyTitle);
    if (hasOfflineSignal) {
      throw new Error(`Panel shows sidecar offline signal during smoke pass: ${JSON.stringify(panelConnectivityState)}`);
    }

    await waitForSidecarRuntimeReadiness({
      healthUrl,
      timeoutMs: 8_000,
      pollMs: 250
    });
    console.log("qa-smoke: sidecar post-action ready");

    const report = {
      suite: "qa-smoke",
      extensionId,
      targetUrl: webPage.url(),
      outcome,
      chipText,
      healthUrl,
      artifactPath: path.relative(ROOT, screenshotPath).split(path.sep).join("/")
    };

    writeFileSync(path.join(OUTPUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await safeScreenshot(panel, path.join(OUTPUT_DIR, "panel-failure.png"));
    throw error;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    rmSync(profileDir, { recursive: true, force: true });
    rmSync(extensionDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
NODE
