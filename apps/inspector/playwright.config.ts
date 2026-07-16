import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: '../..',
  testMatch: [
    'apps/inspector/e2e/**/*.spec.ts',
    'artifacts/camp-demo/e2e/**/*.spec.mts',
  ],
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
