import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev 서버 + React 플러그인(JSX 변환). 데이터 연결은 나중 — 지금은 화면만.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false },
})
