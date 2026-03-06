import { describe, expect, it } from "vitest";

import {
  buildBenchmarkWorkspace,
  createBenchmarkMarker,
  isBenchmarkTaggedUrl
} from "../../scripts/lib/live-benchmark-tabs.js";

describe("live benchmark tab workspace", () => {
  it("tags both the site url and panel url with a stable benchmark marker", () => {
    const marker = createBenchmarkMarker({
      modelId: "models/gemini-2.5-flash",
      scenarioName: "javascript-prompt"
    });

    const workspace = buildBenchmarkWorkspace({
      benchmarkMarker: marker,
      targetUrl: "https://the-internet.herokuapp.com/javascript_alerts",
      panelUrl: "chrome-extension://atlas/panel.html",
      modelId: "models/gemini-2.5-flash",
      scenarioName: "javascript-prompt"
    });

    expect(workspace.benchmarkMarker).toBe(marker);
    expect(workspace.siteUrl).toContain("atlas-benchmark=");
    expect(workspace.panelUrl).toContain("atlas-benchmark=");
    expect(workspace.siteUrl.startsWith("https://the-internet.herokuapp.com/javascript_alerts")).toBe(true);
    expect(workspace.title).toContain("Gemini 2.5 Flash");
    expect(workspace.title.toLowerCase()).toContain("javascript prompt");
  });

  it("detects benchmark-tagged urls without matching unrelated urls", () => {
    expect(isBenchmarkTaggedUrl("https://the-internet.herokuapp.com/upload?atlas-benchmark=bench-123")).toBe(true);
    expect(isBenchmarkTaggedUrl("chrome-extension://atlas/panel.html?atlas-benchmark=bench-123")).toBe(true);
    expect(isBenchmarkTaggedUrl("https://the-internet.herokuapp.com/upload")).toBe(false);
  });
});
