import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createContextAnalysisApiMiddleware } from "./server/contextAnalysisApi.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "modu-brain-context-analysis-api",
      configureServer(server) {
        server.middlewares.use(createContextAnalysisApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createContextAnalysisApiMiddleware());
      },
    },
  ],
});
