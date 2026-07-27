import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
    // 상위 hub/shared/regions.json 정적 import 허용(프로젝트 루트 밖 파일)
    fs: { allow: ['..'] },
  },
})
