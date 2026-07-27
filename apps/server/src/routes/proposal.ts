import { Router } from "express";
import { buildTodayProposal } from "../agent/pipeline";
import { diagnose } from "../agent/diagnose";
import {
  getFirstStore,
  getStoreById,
  getSalesWithWeather,
  saveTodayCampaign,
  getTodayCampaign,
  getLatestCampaignBefore,
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
    const queryStoreId = req.query.storeId as string | undefined;
    const store = queryStoreId ? await getStoreById(queryStoreId) : await getFirstStore();
    const today = todayYmdKst();
    let campaign = await getTodayCampaign(store.id, today);

    // 실패 대본(5-3) — 오늘 제안이 없으면 마지막 성공분을 대신 보여준다.
    // 기동 잡이 도는 중이면 곧 오늘 것으로 바뀌고, 날씨·DB 장애로 못 만든 경우엔
    // 화면이 "만드는 중"에 영원히 머무는 대신 지난 제안이라도 뜬다. stale로 정직하게 표시.
    let stale = false;
    if (!campaign) {
      campaign = await getLatestCampaignBefore(store.id, today);
      stale = campaign !== null;
    }

    if (!campaign) {
      return res.json({
        proposal: null,
        message: "오늘 제안을 만드는 중입니다", // 기동 잡(runBootProposalJob)이 수 초 내 생성한다
      });
    }
    // 진단은 campaigns에 저장하지 않으므로 조회 시 재계산한다(POST /generate와 동일 형태).
    const diagnosis = diagnose(await getSalesWithWeather(store.id), store.category ?? "default");
    res.json({
      campaignId: campaign.id,
      date: campaign.date,
      status: campaign.status,
      weather: campaign.weather,
      diagnosis,
      proposal: campaign.proposal,
      ...(stale ? { stale: true } : {}),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "제안 조회 실패" });
  }
});
