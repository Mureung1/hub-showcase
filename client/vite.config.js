import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // e2e/는 Playwright 전용 테스트라 vitest가 실행하면 안 된다 (test() 시그니처가 달라 충돌함).
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
