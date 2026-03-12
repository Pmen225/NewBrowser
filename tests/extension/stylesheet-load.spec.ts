import { describe, expect, it } from "vitest";

import { waitForStylesheetLoad } from "../../extension/lib/stylesheet-load.js";

class FakeStylesheetLink extends EventTarget {
  disabled = false;
  sheet = null;
}

describe("waitForStylesheetLoad", () => {
  it("resolves immediately when the stylesheet is already ready", async () => {
    const link = new FakeStylesheetLink();
    link.sheet = {};

    await expect(waitForStylesheetLoad(link)).resolves.toBe(link);
  });

  it("waits for the load event before resolving", async () => {
    const link = new FakeStylesheetLink();
    const readyPromise = waitForStylesheetLoad(link);

    setTimeout(() => {
      link.sheet = {};
      link.dispatchEvent(new Event("load"));
    }, 0);

    await expect(readyPromise).resolves.toBe(link);
  });

  it("rejects when the stylesheet fails to load", async () => {
    const link = new FakeStylesheetLink();
    const readyPromise = waitForStylesheetLoad(link);

    setTimeout(() => {
      link.dispatchEvent(new Event("error"));
    }, 0);

    await expect(readyPromise).rejects.toThrow("Stylesheet failed to load");
  });
});
