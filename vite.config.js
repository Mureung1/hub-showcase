import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // .claude/ 아래 PPT 렌더링 산출물(PNG·pptx)이 PowerPoint/탐색기 등에서 잠깐씩 잠기는 경우가 있는데,
    // Vite가 이 폴더까지 감시하다가 EBUSY 에러로 개발 서버 전체가 죽는 일이 반복돼서 감시 대상에서 제외한다.
    watch: {
      ignored: ['**/.claude/**'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
