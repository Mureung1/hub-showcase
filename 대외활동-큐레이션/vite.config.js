import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',        // Node에서 브라우저 DOM 흉내 (컴포넌트 테스트용)
    globals: true,               // testing-library가 각 테스트 후 자동 cleanup 하도록(안 하면 렌더가 쌓임)
    setupFiles: './src/setupTests.js',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
})
