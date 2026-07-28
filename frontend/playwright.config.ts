import { defineConfig } from '@playwright/test'

// CI에서 frontend(5173)·backend(3000)를 직접 띄우고 E2E를 돈다. 필요한 env(SUPABASE_*,
// GEMINI_API_KEY)는 GitHub Actions 워크플로가 job 레벨 env로 주입하며, backend는
// dotenv/config가 이미 설정된 process.env를 그대로 쓰므로 .env 파일이 없어도 동작한다.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev --prefix ../backend',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
