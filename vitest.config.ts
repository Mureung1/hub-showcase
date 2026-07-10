import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.mjs"],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}", "server/**/*.mjs"],
      exclude: ["src/vite-env.d.ts", "src/main.tsx", "**/*.test.{ts,tsx,mjs}"],
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 80,
        lines: 75,
      },
    },
  },
});
