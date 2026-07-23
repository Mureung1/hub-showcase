import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "server/**/*.test.mjs",
      "worker/**/*.test.ts",
      "scripts/ops/**/*.test.mjs",
      "tests/eval/**/*.test.mjs",
    ],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    // Coverage instrumentation can make full DOM workflows exceed Vitest's
    // 5-second default on slower Windows runners. Keep a finite suite-wide
    // budget so real hangs still fail while isolated and coverage runs agree.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}", "server/**/*.mjs"],
      exclude: ["src/vite-env.d.ts", "src/main.tsx", "**/*.test.{ts,tsx,mjs}"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 80,
      },
    },
  },
});
