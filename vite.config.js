import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: GitHub Pages(kimsunho2000.github.io/hub/) 하위 경로 배포용
export default defineConfig({
  base: '/hub/',
  plugins: [react()],
})
