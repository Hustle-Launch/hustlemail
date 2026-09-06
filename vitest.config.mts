import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}", "apps/web/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "tests/e2e/**"],
    testTimeout: 15000,
  },
});
