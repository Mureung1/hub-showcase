import { Router } from "express";
import { buildTodayProposal } from "../agent/pipeline";
import {
  getFirstStore,
  saveTodayCampaign,
  getTodayCampaign,
  todayYmdKst,
} from "../db/queries";

export const proposalRouter = Router();

/**
 * POST /proposal/generate
 * 매장의 오늘 제안을 생성하고 campaigns에 저장한다(draft). body: { storeId? }
 */
proposalRouter.post("/generate", async (req, res) => {
  try {
    const storeId = req.body?.storeId as string | undefined;
    const result = await buildTodayProposal(storeId);
    const campaign = await saveTodayCampaign(
      result.store.id,
      todayYmdKst(),
      result.weather,
      result.proposal,
    );
    res.json({
      store: { id: result.store.id, name: result.store.name },
      weather: result.weather,
      diagnosis: result.diagnosis,
      proposal: result.proposal,
      campaignId: campaign.id,
      status: campaign.status,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "제안 생성 실패" });
  }
});

/**
 * GET /proposal/today
 * 오늘 저장된 제안을 조회한다. 없으면 proposal: null (생성은 POST/크론 담당).
 */
proposalRouter.get("/today", async (req, res) => {
  try {
    const storeId = (req.query.storeId as string | undefined) ?? (await getFirstStore()).id;
    const campaign = await getTodayCampaign(storeId, todayYmdKst());
    if (!campaign) {
      return res.json({ proposal: null, message: "오늘 생성된 제안이 아직 없습니다" });
    }
    res.json({
      campaignId: campaign.id,
      date: campaign.date,
      status: campaign.status,
      weather: campaign.weather,
      proposal: campaign.proposal,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "제안 조회 실패" });
  }
});
