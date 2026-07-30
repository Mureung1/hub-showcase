import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: GitHub Pages(kimsunho2000.github.io/hub/) 하위 경로 배포용
export default defineConfig({
  base: '/hub/',
  plugins: [react()],
  // Vitest 기본 include가 e2e/*.spec.js(Playwright)까지 잡아 무조건 실패하므로 대상을 src로 좁힌다.
  // 두 러너의 역할 분리는 docs/testing.md 참조 — E2E는 `npm run test:e2e`로 따로 돌린다
  test: {
    include: ['src/**/*.test.{js,jsx}'],
  },
})
