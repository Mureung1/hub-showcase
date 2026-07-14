import type { LiveHealthResponse, ReadyHealthResponse } from "@baro-jinryo/shared";
import { Router } from "express";
import { checkDatabaseConnection, logDatabaseError } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/live", (_request, response) => {
  const body: LiveHealthResponse = {
    ok: true,
    check: "live",
    service: "baro-jinryo-api",
    timestamp: new Date().toISOString(),
  };

  response.json(body);
});

healthRouter.get("/ready", async (_request, response) => {
  const startedAt = performance.now();

  try {
    const databaseLatencyMs = await checkDatabaseConnection();
    const body: ReadyHealthResponse = {
      ok: true,
      check: "ready",
      database: "up",
      databaseLatencyMs,
      service: "baro-jinryo-api",
      timestamp: new Date().toISOString(),
    };

    response.json(body);
  } catch (error) {
    logDatabaseError("readiness 확인 실패", error);

    const body: ReadyHealthResponse = {
      ok: false,
      check: "ready",
      database: "down",
      databaseLatencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      message: "데이터베이스에 연결할 수 없습니다.",
      service: "baro-jinryo-api",
      timestamp: new Date().toISOString(),
    };

    response.status(503).json(body);
  }
});
