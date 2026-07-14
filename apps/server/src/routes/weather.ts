import { Router } from "express";
import { getFirstStore } from "../db/queries";
import { getEnsembleWeather } from "../agent/ensemble";

export const weatherRouter = Router();

/**
 * GET /weather/today
 * 기본 매장의 오늘 앙상블 날씨를 반환한다.
 */
weatherRouter.get("/today", async (_req, res) => {
  try {
    const store = await getFirstStore();
    const weather = await getEnsembleWeather(store);
    res.json({ store: { id: store.id, name: store.name }, weather });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "날씨 조회 실패" });
  }
});
