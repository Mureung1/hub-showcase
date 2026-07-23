import { defineConfig, devices } from '@playwright/test'

// #16 E2E 테스트 전용 설정 — 기존 vitest(npm run test)와 완전히 분리된 실행 경로다.
// 프론트(:5173)+백엔드(:4000) 둘 다 로컬에 이미 시드된 DB(server/data/specfit.db)를 전제로 하므로
// CI 연동은 이번 스코프가 아니다(로컬 실행만).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm start',
      cwd: './server',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
