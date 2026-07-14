import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.provider-gateway.jsonc"
      }
    })
  ],
  test: {
    coverage: {
      enabled: false
    },
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    maxWorkers: 1,
    testTimeout: 10_000
  }
});
