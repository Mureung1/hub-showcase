import { Router } from "express";
import { buildTodayProposal } from "../agent/pipeline";

export const proposalRouter = Router();

/**
 * POST /proposal/generate
 * 매장의 오늘 제안을 생성한다. body: { storeId? }
 */
proposalRouter.post("/generate", async (req, res) => {
  try {
    const storeId = req.body?.storeId as string | undefined;
    const result = await buildTodayProposal(storeId);
    res.json({
      store: { id: result.store.id, name: result.store.name },
      weather: result.weather,
      diagnosis: result.diagnosis,
      proposal: result.proposal,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "제안 생성 실패" });
  }
});
