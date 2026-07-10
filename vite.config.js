import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 로컬 dev: server/(Express, PORT=3001)로 그대로 넘긴다.
      // 프로덕션에서는 vercel.json rewrite가 같은 /api 경로를 api/index.js로 넘기므로
      // 프론트 코드 입장에서는 로컬/배포 모두 동일하게 '/api'로만 호출하면 된다.
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
})
