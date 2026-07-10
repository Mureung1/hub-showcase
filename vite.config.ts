import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createContextAnalysisApiMiddleware } from "./server/contextAnalysisApi.mjs";

const serverEnvironmentKeys = [
  "MODU_BRAIN_ANALYSIS_PROVIDER",
  "MODU_BRAIN_OPENAI_MODEL",
  "OPENAI_API_KEY",
];

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, process.cwd(), "");

  for (const key of serverEnvironmentKeys) {
    if (!process.env[key] && fileEnvironment[key]) {
      process.env[key] = fileEnvironment[key];
    }
  }

  return {
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
  };
});
