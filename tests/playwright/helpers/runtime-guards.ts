import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { BrowserContext, LaunchPersistentContextOptions, Page } from "playwright";

const requireFromTs = createRequire(import.meta.url);

const trackedContexts = new Set<BrowserContext>();
let cleanupInstalled = false;
let shuttingDown = false;
type PlaywrightChromiumLauncher = {
  launchPersistentContext: (
    userDataDir: string,
    options?: LaunchPersistentContextOptions
  ) => Promise<BrowserContext>;
};

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
  const chromium = resolvePlaywrightChromiumLauncher();
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

type ResolvePlaywrightChromiumLauncherOptions = {
  assertBootstrapReady?: () => void;
  requirePlaywright?: () => unknown;
};

function defaultAssertBootstrapReady(): void {
  const { assertPlaywrightBootstrapReady } = requireFromTs("../../../scripts/lib/playwright-bootstrap-check.cjs") as {
    assertPlaywrightBootstrapReady: (options?: { timeoutMs?: number }) => void;
  };
  assertPlaywrightBootstrapReady({
    timeoutMs: 15_000
  });
}

function defaultRequirePlaywright(): unknown {
  return requireFromTs("playwright");
}

export function resolvePlaywrightChromiumLauncher({
  assertBootstrapReady = defaultAssertBootstrapReady,
  requirePlaywright = defaultRequirePlaywright
}: ResolvePlaywrightChromiumLauncherOptions = {}): PlaywrightChromiumLauncher {
  try {
    assertBootstrapReady();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const classification = error && typeof error === "object" && typeof error.classification === "string"
      ? error.classification
      : "runtime_bootstrap_failure";
    const phase = error && typeof error === "object" && typeof error.phase === "string"
      ? error.phase
      : "";
    const code = error && typeof error === "object" && typeof error.code === "string"
      ? error.code
      : "UNKNOWN";
    const phaseDetail = phase ? `; phase=${phase}` : "";
    throw new Error(
      `Playwright bootstrap gate failed before launchPersistentContext; classification=${classification}; code=${code}${phaseDetail}. ${detail}`
    );
  }

  const playwrightModule = requirePlaywright() as { chromium?: unknown };
  const chromiumCandidate = playwrightModule?.chromium as
    | { launchPersistentContext?: PlaywrightChromiumLauncher["launchPersistentContext"] }
    | undefined;

  if (typeof chromiumCandidate?.launchPersistentContext !== "function") {
    throw new Error(
      "Invalid playwright module: missing chromium.launchPersistentContext function"
    );
  }

  return chromiumCandidate as PlaywrightChromiumLauncher;
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
