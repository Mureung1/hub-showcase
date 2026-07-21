// ============================================================================
// vite.config.js — 개발 서버(vite) 설정
// ----------------------------------------------------------------------------
// vite = 프론트 개발 서버 + 빌드 도구. `npm run dev` 하면 이 설정으로 뜬다.
//
// [왜 중요한가] 아래 proxy 설정이 "프론트의 /api 요청 → 백엔드(8080)로 전달"을 해준다.
// 프론트(예: localhost:5173)와 백엔드(localhost:8080)는 주소가 달라서, 그냥 부르면
// 브라우저가 보안상 막는다(CORS). 개발 중엔 이 프록시로 같은 주소인 척 우회한다.
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // JSX 등 React 문법을 브라우저가 이해하게 변환하는 플러그인

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 로 시작하는 요청을 백엔드(http://localhost:8080)로 프록시해 CORS 없이 연동한다.
    // 예: 프론트가 GET /api/parking-lots → 실제로는 백엔드의 http://localhost:8080/api/parking-lots 로 감.
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 전달할 백엔드 주소
        changeOrigin: true,              // 요청의 Host 헤더를 target에 맞춰 바꿈(프록시 표준 설정)
      },
    },
    // 디자인 토큰 원본(docs/design/tokens.css)을 프론트 루트 밖에서 import하기 위해 상위 경로 허용.
    fs: {
      allow: ['..'],
    },
  },
});
