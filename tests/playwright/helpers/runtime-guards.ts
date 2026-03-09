import { mkdirSync } from "node:fs";
import path from "node:path";

import type { BrowserContext, LaunchPersistentContextOptions, Page } from "playwright";
import { chromium } from "playwright";

const trackedContexts = new Set<BrowserContext>();
let cleanupInstalled = false;
let shuttingDown = false;

async function closeTrackedContexts(): Promise<void> {
  const contexts = [...trackedContexts];
  trackedContexts.clear();
  await Promise.allSettled(contexts.map((context) => context.close().catch(() => {})));
}

function installContextCleanup(): void {
  if (cleanupInstalled) {
    return;
  }
  cleanupInstalled = true;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await Promise.race([
      closeTrackedContexts(),
      new Promise((resolve) => setTimeout(resolve, 1_500))
    ]);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      shutdown().finally(() => process.exit(1));
    });
  }

  process.once("beforeExit", () => {
    void shutdown();
  });
}

export async function withTimeout<T>(
  label: string,
  promise: Promise<T>,
  timeoutMs = 8_000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function resolveExtensionId(
  context: BrowserContext,
  timeoutMs = 8_000
): Promise<string> {
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

export async function launchManagedPersistentContext(
  userDataDir: string,
  options: LaunchPersistentContextOptions,
  timeoutMs = 15_000
): Promise<BrowserContext> {
  installContextCleanup();
  const context = await withTimeout(
    "launchPersistentContext",
    chromium.launchPersistentContext(userDataDir, options),
    timeoutMs
  );
  trackedContexts.add(context);
  context.on("close", () => {
    trackedContexts.delete(context);
  });
  return context;
}

export async function safePageScreenshot(page: Page | null | undefined, filePath: string): Promise<void> {
  if (!page) {
    return;
  }

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    await page.screenshot({ path: filePath });
  } catch {
    // Best-effort debug artifact only.
  }
}
