import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./common/config/env";
import { errorHandler } from "./common/middlewares/errorHandler";
import { healthRouter } from "./modules/health/health.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use(
    cors({
      origin: env.corsOrigin
    })
  );
  app.use(express.json());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.rateLimitPerMinute,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use("/api/health", healthRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  app.use(errorHandler);

  return app;
}
