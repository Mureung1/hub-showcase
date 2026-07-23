import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/ingredients': 'http://localhost:3000',
      '/products': 'http://localhost:3000',
      '/profile': 'http://localhost:3000',
    },
  },
})
