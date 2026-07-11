import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createApiV1Handler } from "./server/apiV1.mjs";
import { createContextAnalysisApiMiddleware } from "./server/contextAnalysisApi.mjs";

const serverEnvironmentKeys = [
  "MODU_BRAIN_ANALYSIS_PROVIDER",
  "MODU_BRAIN_OPENAI_ENABLED",
  "MODU_BRAIN_OPENAI_MODEL",
  "MODU_BRAIN_OPENAI_REASONING_EFFORT",
  "OPENAI_API_KEY",
  "SAFETY_IDENTIFIER_SECRET",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
];

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, process.cwd(), "");

  for (const key of serverEnvironmentKeys) {
    if (!process.env[key] && fileEnvironment[key]) {
      process.env[key] = fileEnvironment[key];
    }
  }

  const apiV1Handler = createApiV1Handler();
  const apiV1Middleware = async (
    request: Parameters<typeof apiV1Handler>[0],
    response: Parameters<typeof apiV1Handler>[1],
    next: () => void,
  ) => {
    const pathname = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    ).pathname;
    if (!(await apiV1Handler(request, response, pathname))) next();
  };

  return {
    plugins: [
      react(),
      {
        name: "modu-brain-context-analysis-api",
        configureServer(server) {
          server.middlewares.use(apiV1Middleware);
          server.middlewares.use(
            createContextAnalysisApiMiddleware({
              analysisOptions: { provider: "local-heuristic" },
            }),
          );
        },
        configurePreviewServer(server) {
          server.middlewares.use(apiV1Middleware);
          server.middlewares.use(
            createContextAnalysisApiMiddleware({
              analysisOptions: { provider: "local-heuristic" },
            }),
          );
        },
      },
    ],
  };
});
