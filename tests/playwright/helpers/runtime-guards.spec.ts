import { describe, expect, it, vi } from "vitest";

import { resolvePlaywrightChromiumLauncher } from "./runtime-guards";

describe("runtime guard bootstrap-gated launcher", () => {
  it("fails before requiring playwright when bootstrap guard fails", () => {
    const bootstrapError = new Error(
      "Playwright bootstrap probe failed in 15000ms; classification=runtime_bootstrap_timeout; phase=load-playwright-core; code=ETIMEDOUT"
    ) as Error & {
      classification?: string;
      phase?: string;
      code?: string;
    };
    bootstrapError.classification = "runtime_bootstrap_timeout";
    bootstrapError.phase = "load-playwright-core";
    bootstrapError.code = "ETIMEDOUT";
    const assertBootstrapReady = vi.fn(() => {
      throw bootstrapError;
    });
    const requirePlaywright = vi.fn(() => {
      throw new Error("playwright should not load");
    });

    expect(() =>
      resolvePlaywrightChromiumLauncher({
        assertBootstrapReady,
        requirePlaywright
      })
    ).toThrow(/classification=runtime_bootstrap_timeout/);
    expect(assertBootstrapReady).toHaveBeenCalledTimes(1);
    expect(requirePlaywright).not.toHaveBeenCalled();
  });

  it("returns chromium launcher when module shape is valid", () => {
    const launchPersistentContext = vi.fn();
    const assertBootstrapReady = vi.fn();
    const requirePlaywright = vi.fn(() => ({
      chromium: {
        launchPersistentContext
      }
    }));

    const chromium = resolvePlaywrightChromiumLauncher({
      assertBootstrapReady,
      requirePlaywright
    });

    expect(assertBootstrapReady).toHaveBeenCalledTimes(1);
    expect(requirePlaywright).toHaveBeenCalledTimes(1);
    expect(chromium.launchPersistentContext).toBe(launchPersistentContext);
  });

  it("rejects invalid playwright module shapes", () => {
    const assertBootstrapReady = vi.fn();
    const requirePlaywright = vi.fn(() => ({
      chromium: {}
    }));

    expect(() =>
      resolvePlaywrightChromiumLauncher({
        assertBootstrapReady,
        requirePlaywright
      })
    ).toThrow(/chromium\.launchPersistentContext/);
  });
});
