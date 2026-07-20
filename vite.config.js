import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 화면(5173)에서 /api 로 부르면 Express(3000)로 넘겨줌 → CORS·주소 신경 안 씀
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
