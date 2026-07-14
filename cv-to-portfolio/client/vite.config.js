import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 클라이언트 최소 구성 (라우터/상태관리/UI 라이브러리 없음 — 단일 흐름 4단계).
// 개발 중 /api 요청은 Express 서버(기본 4000 포트)로 프록시한다.
// → 클라이언트는 상대경로 fetch("/api/...")만 쓰면 되고, API 키는 서버에만 존재한다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY || "http://localhost:4000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
