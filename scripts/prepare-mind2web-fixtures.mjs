import path from "node:path";
import process from "node:process";

import {
  materializeLocalMind2WebSubset,
  materializeOnlineMind2WebSubset
} from "./lib/mind2web-fixtures.js";

async function main() {
  const root = process.cwd();
  const source = (process.env.MIND2WEB_SOURCE?.trim() || "local").toLowerCase();

  if (source === "online-mind2web") {
    const outputPath = await materializeOnlineMind2WebSubset({
      root,
      outputPath: path.join(root, "data", "benchmarks", "mind2web", "online", "online-subset.json")
    });
    console.log(outputPath);
    return;
  }

  const outputPath = materializeLocalMind2WebSubset(root);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
