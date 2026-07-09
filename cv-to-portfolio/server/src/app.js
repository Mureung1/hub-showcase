import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

// Express 앱 조립. (index.js 가 이걸 받아 listen 한다 — 테스트에서 앱만 import 가능.)
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
