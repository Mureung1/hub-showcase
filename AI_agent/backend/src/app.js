import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { analysisRouter } from "./routes/analysisRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { careerRouter } from "./routes/careerRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { specRouter } from "./routes/specRoutes.js";
import { submissionRouter } from "./routes/submissionRoutes.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin,
    })
  );
  app.use(express.json({ limit: "3mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/specs", specRouter);
  app.use("/api/analysis", analysisRouter);
  app.use("/api/submissions", submissionRouter);
  app.use("/api", careerRouter);

  app.use((error, request, response, next) => {
    console.error(error);

    if (error.code === "ECONNREFUSED") {
      response.status(503).json({
        message: "DB에 연결할 수 없습니다. PostgreSQL이 실행 중인지 확인해 주세요.",
      });
      return;
    }

    response.status(error.statusCode || 500).json({
      message: error.message || "서버 요청 처리 중 오류가 발생했습니다.",
      details: error.details,
    });
  });

  return app;
};
