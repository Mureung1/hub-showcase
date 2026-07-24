import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI 분리배출 도우미',
        short_name: 'EcoBot',
        theme_color: '#279160',
        background_color: '#f3f6f2',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev'],
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
