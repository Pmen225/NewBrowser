import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/playwright/funnels/**/*.spec.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    teardownTimeout: 15_000
  }
});
