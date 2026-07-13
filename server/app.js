import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.disable("x-powered-by");
app.use(pinoHttp({ logger }));
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/health", healthRouter);

app.use((request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: `${request.method} ${request.path} endpoint not found` },
  });
});

app.use((error, request, response, _next) => {
  request.log.error({ err: error }, "Unhandled request error");
  response.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "서버 오류가 발생했습니다." },
  });
});
