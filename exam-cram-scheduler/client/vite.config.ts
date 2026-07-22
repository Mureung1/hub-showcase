import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // #24 — 프론트(:5173)와 Express 서버(:4000)는 포트가 달라서 브라우저가 교차 출처로 보고 막는다.
  // Vite 개발 서버가 /api 요청을 대신 :4000으로 중계하면, 브라우저 입장에서는 같은 출처(:5173)와만
  // 통신한 셈이라 차단되지 않는다. 프론트 코드는 절대 주소 없이 '/api/...'만 쓰면 된다.
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
