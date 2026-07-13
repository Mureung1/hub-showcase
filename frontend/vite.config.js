import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // design/design-tokens.css(저장소 루트)를 frontend 밖에서 import하기 위함
      allow: ['..'],
    },
  },
})
