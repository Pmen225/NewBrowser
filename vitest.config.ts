import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    fileParallelism: false,
    testTimeout: 45_000,
    hookTimeout: 45_000,
    teardownTimeout: 10_000
  }
});
