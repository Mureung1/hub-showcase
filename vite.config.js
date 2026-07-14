import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // 프로젝트 소개(index.html)와 실제 제품(product.html)은 서로 독립된 화면이라
      // 별도 HTML 진입점으로 분리한다. src/App.jsx는 project-intro 전용으로 유지한다.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        product: fileURLToPath(new URL('./product.html', import.meta.url)),
      },
    },
  },
})
