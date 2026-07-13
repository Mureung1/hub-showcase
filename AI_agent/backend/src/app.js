import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { authRouter } from "./routes/authRoutes.js";
import { careerRouter } from "./routes/careerRoutes.js";
import { healthRouter } from "./routes/healthRoutes.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin,
    })
  );
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api", careerRouter);

  app.use((error, request, response, next) => {
    console.error(error);
    response.status(500).json({
      message: error.message || "서버 요청 처리 중 오류가 발생했습니다.",
    });
  });

  return app;
};
