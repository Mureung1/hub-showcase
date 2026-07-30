import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    base: env.VITE_DEPLOY_BASE || "/",
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/ready": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
