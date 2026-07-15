import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.js";
import { mockRouter } from "./routes/mock.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/api/health", healthRouter);
  app.use("/api/mock", mockRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
