import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 내부 TS 패키지를 소스로 직접 소비 (빌드 스텝 없음).
      "@sherpa/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url)
      ),
    },
  },
  server: { port: 5173, open: false },
});
