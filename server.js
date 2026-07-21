import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  isSupabaseConfigured,
  SupabaseConfigurationError
} from "./backend/config/supabaseClient.js";
import emotionAnalysisRouter from "./backend/features/emotion-analyses/emotionAnalysisRoutes.js";
import { RequestValidationError } from "./backend/features/emotion-analyses/emotionAnalysisValidation.js";
import { SupabaseRepositoryError } from "./backend/repositories/emotionAnalysisRepository.js";

dotenv.config({ quiet: true });

const app = express();
const requestedPort = Number.parseInt(
  process.env.PORT ?? process.env.SERVER_PORT ?? "",
  10
);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
]);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
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
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use("/api/emotion-analyses", emotionAnalysisRouter);

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

app.listen(port, () => {
  console.log(`Express server listening on http://localhost:${port}`);
  console.log(
    `Supabase configuration: ${isSupabaseConfigured() ? "ready" : "not configured"}`
  );
});

export default app;
