import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/playwright/funnels/**/*.spec.ts"],
    environment: "node"
  }
});
