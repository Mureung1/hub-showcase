import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { createServer as createApiServer } from "./server";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const api = createApiServer({ get: (name) => env[name] });

  return {
    plugins: [
      react(),
      {
        name: "manager-xp-api",
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
            const requestUrl = request.url ?? "";
            if (!requestUrl.startsWith("/api/")) {
              next();
              return;
            }

            try {
              const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request);
              const apiResponse = await api(new Request(`http://localhost${requestUrl}`, { method: request.method, body }));

              response.statusCode = apiResponse.status;
              apiResponse.headers.forEach((value, key) => response.setHeader(key, value));
              response.end(await apiResponse.text());
            } catch {
              response.statusCode = 503;
              response.setHeader("content-type", "application/json; charset=utf-8");
              response.end(JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR", message: "Local API is not configured." } }));
            }
          });
        },
      },
    ],
  };
});

function readRequestBody(request: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
