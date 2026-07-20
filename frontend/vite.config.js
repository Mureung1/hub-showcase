import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // design/design-tokens.css(저장소 루트)를 frontend 밖에서 import하기 위함
      allow: ['..'],
    },
    // /api 요청을 backend(Express)로 프록시 — dev CORS 회피 + 번들에 host 하드코딩 안 함
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // 순수 로직 테스트는 jsdom 없이도 돌지만, 컴포넌트 테스트와 한 설정으로 묶는다.
    include: ['src/**/*.test.{js,jsx}'],
  },
})
