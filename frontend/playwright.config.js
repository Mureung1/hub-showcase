import { defineConfig } from '@playwright/test'

// E2E 통합 테스트 (docs/checklist.md Week3) — 실제 GitHub/LLM API를 그대로 호출한다(mock 없음).
// baseURL에 /hub/를 포함하는 이유: vite.config.js의 base가 dev 서버에도 적용돼 dev 서버도 그 경로 밑에서 서빙됨.
// HashRouter를 쓰므로 화면 경로는 이 baseURL 뒤에 #/input 처럼 해시로 이어붙는다 (main.jsx 참고)
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 같은 githubId·조건으로 여러 테스트가 동시에 돌면 재추천 하루 상한과 꼬일 수 있음
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/hub/',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '.',
      url: 'http://localhost:5173/hub/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
