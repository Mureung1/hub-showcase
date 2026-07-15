import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청을 Express(3001)로 전달 — 브라우저는 5173 하나만 바라본다
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
