import { defineConfig } from 'playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  testDir: 'e2e',
  outputDir: fileURLToPath(new URL('./test-results', import.meta.url)),
  testMatch: '**/*.spec.mts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'line',
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: {
          width: 1440,
          height: 900,
        },
      },
    },
  ],
})
