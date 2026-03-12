import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const serverSource = readFileSync(path.join(ROOT, "sidecar", "src", "server.ts"), "utf8");

describe("sidecar active tab routing", () => {
  it("treats an explicit SetActiveTab selection as the default run target", () => {
    expect(serverSource).toContain("onActiveTabChanged: (tabId: string) => {");
    expect(serverSource).toContain("activeTabId = tabId;");
    expect(serverSource).toContain("lastPageTabId = tabId;");
    expect(serverSource).toContain("resolveDefaultTabId: () => getRuntimeTabState().activeTabId,");
  });

  it("sanitises exported runtime tab state against the live registry", () => {
    expect(serverSource).toContain("const getRuntimeTabState = () =>");
    expect(serverSource).toContain("resolveRuntimeTabState({");
    expect(serverSource).toContain("active_tab_id: runtimeTabState.activeTabId,");
  });
});
