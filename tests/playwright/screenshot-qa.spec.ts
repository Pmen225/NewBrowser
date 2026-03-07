/**
 * QA test: screenshot button in the side panel + menu.
 * Launches Chromium with the extension loaded, opens a page, opens the panel,
 * clicks + → Screenshot, and verifies the attachment chip and toast appear.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTENSION_PATH = path.join(ROOT, "extension");

async function resolveExtensionId(
  context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>
): Promise<string> {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const id = sw.url().split("/")[2];
  if (!id) throw new Error("Could not resolve extension ID from service worker URL");
  return id;
}

describe("Screenshot button QA", () => {
  it("+ → Screenshot captures the visible tab and shows attachment chip + toast", async () => {
    expect(existsSync(path.join(EXTENSION_PATH, "manifest.json")), "Extension not built").toBe(true);

    // Copy extension to a temp dir so we can patch the panel URLs
    const tempExt = mkdtempSync(path.join(tmpdir(), "screenshot-qa-ext-"));
    cpSync(EXTENSION_PATH, tempExt, { recursive: true });

    const profileDir = mkdtempSync(path.join(tmpdir(), "screenshot-qa-profile-"));

    let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;
    try {
      try {
        context = await chromium.launchPersistentContext(profileDir, {
          channel: "chromium",
          headless: false, // must be headed for captureVisibleTab
          args: [
            `--disable-extensions-except=${tempExt}`,
            `--load-extension=${tempExt}`
          ]
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Could not launch Chromium. Run 'npx playwright install chromium'. ${msg}`);
      }

      const extensionId = await resolveExtensionId(context);

      // Open a normal web page first (captureVisibleTab needs an http/https page)
      const webPage = await context.newPage();
      await webPage.goto("https://example.com");
      await webPage.waitForLoadState("domcontentloaded");

      // Open the panel directly
      const panel = await context.newPage();
      await panel.goto(`chrome-extension://${extensionId}/panel.html`);

      // Wait for the composer to be ready
      await panel.getByLabel("Ask anything").waitFor({ state: "visible", timeout: 8000 });

      // Click the + (plus) button to open the menu
      await panel.locator("#btn-plus").click();

      // Wait for the + menu to appear
      const screenshotBtn = panel.locator("#plus-screenshot");
      await screenshotBtn.waitFor({ state: "visible", timeout: 5000 });

      // Click Screenshot
      await screenshotBtn.click();

      // Wait for either:
      //   (a) attachment chip to appear (success), or
      //   (b) toast with "Screenshot failed" (failure with real error message)
      const attachChip   = panel.locator(".attachment-chip").first();
      const successToast = panel.locator(".toast:not(.error)").first();
      const errorToast   = panel.locator(".toast.error").first();

      // Wait up to 6s for something to happen
      const result = await Promise.race([
        attachChip.waitFor({ state: "visible", timeout: 6000 }).then(() => "chip"),
        successToast.waitFor({ state: "visible", timeout: 6000 }).then(() => "success-toast"),
        errorToast.waitFor({ state: "visible", timeout: 6000 }).then(() => "error-toast"),
      ]).catch(() => "timeout");

      // Take a screenshot of the panel state for debugging
      const shot = path.join(ROOT, "output", "screenshot-qa-result.png");
      await panel.screenshot({ path: shot });
      console.log("Panel screenshot saved to:", shot);

      if (result === "error-toast") {
        const toastText = await errorToast.textContent().catch(() => "unknown");
        throw new Error(`Screenshot failed in UI: "${toastText}"`);
      }

      if (result === "timeout") {
        // Dump panel state
        const state = await panel.evaluate(() => ({
          chips: document.querySelectorAll(".attachment-chip").length,
          toasts: Array.from(document.querySelectorAll(".toast")).map(t => t.textContent),
          attachPreviewHidden: (document.getElementById("attachment-preview") as HTMLElement | null)?.hidden
        }));
        throw new Error(`Timed out waiting for screenshot result. Panel state: ${JSON.stringify(state)}`);
      }

      // Verify the attachment chip is present
      await attachChip.waitFor({ state: "visible", timeout: 3000 });
      const chipText = await panel.locator(".attach-name").first().textContent();
      expect(chipText).toMatch(/screenshot/i);
      console.log("✓ Screenshot captured successfully, chip label:", chipText);

    } finally {
      if (context) await context.close().catch(() => {});
      rmSync(profileDir, { recursive: true, force: true });
      rmSync(tempExt, { recursive: true, force: true });
    }
  }, 45_000);
});
