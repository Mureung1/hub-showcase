import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },  // 백엔드 프록시
  },
  test: {
    environment: "jsdom",              // 브라우저 DOM 흉내 (컴포넌트 렌더용)
    globals: true,                     // describe/it/expect 를 import 없이 사용
    setupFiles: "./src/test/setup.js", // jest-dom 매처 등록
  },
});
