import { defineConfig, devices } from "@playwright/test";

// 프론트(5173)만 baseURL로 쓴다 — /api는 vite.config.js의 기존 proxy로
// server/(3001)에 그대로 넘어가므로 E2E 전용 서버 구성이 따로 필요 없다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Gemini는 API 키를 안 넘겨 항상 rule_based fallback 경로를 타게 하고,
    // 알림/레벨업 대기는 demo 모드로 단축한다(#3에서 실사용).
    command: "npm run dev:all",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_NUDGE_MODE: "demo",
    },
  },
});
