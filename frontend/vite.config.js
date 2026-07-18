import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청을 백엔드(http://localhost:8080)로 프록시해 CORS 없이 연동한다.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    // 디자인 토큰 원본(docs/design/tokens.css)을 프론트 루트 밖에서 import하기 위해 상위 경로 허용.
    fs: {
      allow: ['..'],
    },
  },
});
