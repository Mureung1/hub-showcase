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
})
