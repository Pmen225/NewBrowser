import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const startSidecar = readFileSync(path.join(ROOT, "scripts", "start-sidecar.mjs"), "utf8");
const launchBrowserOnly = readFileSync(path.join(ROOT, "scripts", "launch-browser-only.mjs"), "utf8");

describe("browser launcher profile lock", () => {
  it("hardens the assistant profile in the sidecar launcher", () => {
    expect(startSidecar).toContain('from "./lib/assistant-profile-lock.js"');
    expect(startSidecar).toContain("await hardenAssistantProfile({");
  });

  it("hardens the assistant profile in the browser-only launcher", () => {
    expect(launchBrowserOnly).toContain('from "./lib/assistant-profile-lock.js"');
    expect(launchBrowserOnly).toContain("await hardenAssistantProfile({");
  });
});
