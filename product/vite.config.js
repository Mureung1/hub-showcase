import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // CSS 후처리가 표준 backdrop-filter를 제거하지 않도록 원형을 보존한다.
    cssMinify: false,
  },
  server: {
    // 개발 중 /api 요청을 Express 서버(4000)로 넘긴다.
    // 프론트(5173)와 백(4000)이 다른 포트라 생기는 CORS 문제를 피하는 표준 방법.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
