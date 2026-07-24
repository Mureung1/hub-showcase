import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { recommendationsRouter } from "./routes/recommendations.js";

export const app = express();

app.disable("x-powered-by");
app.use(pinoHttp({ logger }));
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/health", healthRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/recommendations", recommendationsRouter);

app.use((request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: `${request.method} ${request.path} endpoint not found` },
  });
});

app.use((error, request, response, _next) => {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  const code = typeof error.code === "string" ? error.code : "INTERNAL_SERVER_ERROR";
  request.log.error({ err: error, code, status }, "Request failed");
  response.status(status).json({
    error: {
      code,
      message: status === 500 ? "서버 오류가 발생했습니다." : error.message,
      retryable: Boolean(error.retryable),
    },
  });
});
