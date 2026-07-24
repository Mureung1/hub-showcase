/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // hometax guide-extension의 manifest.json externally_connectable이 이 포트를 하드코딩해서
  // 참조한다 — 포트가 조용히 밀리면(5173 사용 중) 확장 연결이 깨지므로 strictPort로 고정한다.
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
