import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React만 쓰는 최소 구성 (라우터/상태관리/UI 라이브러리 없음)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
