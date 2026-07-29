import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  isSupabaseConfigured,
  SupabaseConfigurationError
} from "./backend/config/supabaseClient.js";
import { createServerConfig } from "./backend/config/serverConfig.js";
import {
  createEmotionAnalysisRouter
} from "./backend/features/emotion-analyses/emotionAnalysisRoutes.js";
import { RequestValidationError } from "./backend/features/emotion-analyses/emotionAnalysisValidation.js";
import { SupabaseRepositoryError } from "./backend/repositories/emotionAnalysisRepository.js";
import {
  createGuestSessionRouter,
  mapGuestSessionError
} from "./backend/features/guest-sessions/guestSessionRoutes.js";

dotenv.config({ quiet: true });

const serverConfig = createServerConfig(process.env);
const allowedOrigins = new Set(serverConfig.allowedOrigins);

export function createApp({
  createAnalysis,
  listAnalyses,
  authenticateGuest,
  guestAuthenticationOptions,
  guestSessionOptions,
  healthStatus = () => ({
    databaseConfigured: isSupabaseConfigured(),
    guestSessionsConfigured:
      typeof process.env.GUEST_KEY_PEPPER === "string" &&
      process.env.GUEST_KEY_PEPPER.length >= 32
  }),
  rateLimitOptions = {}
} = {}) {
  const app = express();
  const apiRateLimiter = rateLimit({
    windowMs: serverConfig.rateLimitWindowMs,
    limit: serverConfig.rateLimitMaximum,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(request, response) {
      response.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many API requests. Please try again later."
        }
      });
    },
    ...rateLimitOptions
  });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: serverConfig.jsonBodyLimit }));
  app.get("/health", (request, response) => {
    const checks = healthStatus();
    const ready =
      checks.databaseConfigured === true &&
      checks.guestSessionsConfigured === true;

    response
      .status(ready ? 200 : 503)
      .json({ status: ready ? "ok" : "not_ready", checks });
  });
  app.use(
  "/api",
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error("Origin is not allowed by the CORS policy.");
      error.code = "CORS_ORIGIN_DENIED";
      error.status = 403;
      callback(error);
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "X-Guest-Key"]
  }),
  apiRateLimiter
);

  app.use(
    "/api/guest-sessions",
    createGuestSessionRouter(guestSessionOptions)
  );

  app.use(
    "/api/emotion-analyses",
    createEmotionAnalysisRouter({
      createAnalysis,
      listAnalyses,
      authenticateGuest,
      guestAuthenticationOptions
    })
  );

  app.use((request, response) => {
  response.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested route was not found."
    }
  });
  });

  app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    response.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "The request body must contain valid JSON."
      }
    });
    return;
  }

  if (error instanceof RequestValidationError) {
    response.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (mapGuestSessionError(error, response)) {
    return;
  }

  if (error instanceof SupabaseConfigurationError) {
    console.error(error.message);
    response.status(503).json({
      success: false,
      error: {
        code: error.code,
        message: "The database service is not configured."
      }
    });
    return;
  }

  if (error instanceof SupabaseRepositoryError) {
    console.error(error.cause ?? error);
    response.status(502).json({
      success: false,
      error: {
        code: error.code,
        message: "The database operation failed."
      }
    });
    return;
  }

  if (error.status === 403 && error.code === "CORS_ORIGIN_DENIED") {
    response.status(403).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred."
    }
  });
  });

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== "test") {
  const server = app.listen(serverConfig.port, () => {
    console.log(`Express server listening on http://localhost:${serverConfig.port}`);
    console.log(
      `Supabase configuration: ${isSupabaseConfigured() ? "ready" : "not configured"}`
    );
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; stopping the HTTP server.`);
    server.close((error) => {
      process.exitCode = error ? 1 : 0;
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

export default app;
