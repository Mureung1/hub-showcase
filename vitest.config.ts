import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["apps/**/*.test.ts", "apps/**/*.test.tsx"],
    setupFiles: ["./apps/frontend/src/test/setup.ts"]
  }
});
