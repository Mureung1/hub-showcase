import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    // server/ 밑에도 별도 vitest 설정과 테스트 파일이 있어서, 기본 스캔 범위(전체 프로젝트)를
    // 그대로 두면 여기서도 서버 테스트까지 같이 주워서 돈다 — src/ 안으로만 명시적으로 좁힌다.
    include: ['src/**/*.test.{js,jsx}'],
  },
})
