import { createRequire } from "node:module";

const requireFromTs = createRequire(import.meta.url);
const { assertPlaywrightBootstrapReady } = requireFromTs("../../../scripts/lib/playwright-bootstrap-check.cjs");
import { assertLoopbackBindReady } from "../../../scripts/lib/loopback-bind.js";

export default async function setupFunnelsBootstrapGuard(): Promise<void> {
  await assertLoopbackBindReady();
  assertPlaywrightBootstrapReady({
    timeoutMs: 15_000
  });
}
