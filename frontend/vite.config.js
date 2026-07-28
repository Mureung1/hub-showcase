import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// base(정적 파일 경로 접두사)는 배포 위치마다 다르다.
// - Vercel(기본): 도메인 루트에 올라가므로 '/'
// - GitHub Pages(https://<user>.github.io/hub/): '/hub/' 가 필요하다.
//   → `npm run build:pages` 로 빌드하면 VITE_BASE_PATH=/hub/ 가 들어간다.
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  // 로컬 개발에서는 VITE_API_BASE_URL 없이 같은 오리진의 /api 로 요청하고,
  // 아래 프록시가 Express 서버(3001)로 넘겨준다. (배포에는 프록시가 없어서
  // VITE_API_BASE_URL 로 Render 주소를 직접 부른다 — src/utils/apiBase.js)
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
}))
