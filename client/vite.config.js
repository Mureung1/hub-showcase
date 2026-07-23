import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api 요청은 Express 서버(4000)로 프록시
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    // 브라우저 API(document, localStorage)가 필요하므로 jsdom 환경에서 실행
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
