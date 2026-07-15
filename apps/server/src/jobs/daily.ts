import type { Proposal } from "shared";
import { expectedImpactPct } from "../agent/diagnose";
import {
  collectStoreContext,
  proposalFromContext,
  type StoreContext,
} from "../agent/pipeline";
import { saveTodayCampaign, todayYmdKst, type CampaignRow } from "../db/queries";

/**
 * 매일 아침 자동 제안 잡 (2-6).
 *
 * 오늘 예상 매출 하락률이 임계(−20%) 이상일 때만 제안을 생성·저장한다.
 * 평범한 날엔 조용히 스킵한다 — 마케팅 남발 방지(카니발라이제이션 통제).
 * 실제 사장님 알림 문자는 3-8에서 이 잡에 붙인다.
 */

export const IMPACT_THRESHOLD = -0.2;

export interface DailyJobDeps {
  collect?: (storeId?: string) => Promise<StoreContext>;
  generate?: (ctx: StoreContext) => Promise<Proposal>;
  save?: (
    storeId: string,
    date: string,
    weather: StoreContext["weather"],
    proposal: Proposal,
  ) => Promise<CampaignRow>;
}

export interface DailyJobResult {
  triggered: boolean;
  impactPct: number;
  campaignId?: string;
}

export async function runDailyProposalJob(
  storeId?: string,
  deps: DailyJobDeps = {},
): Promise<DailyJobResult> {
  const collect = deps.collect ?? collectStoreContext;
  const generate = deps.generate ?? proposalFromContext;
  const save = deps.save ?? saveTodayCampaign;

  const ctx = await collect(storeId);
  const impactPct = expectedImpactPct(ctx.diagnosis, ctx.weather);

  // 하락이 임계보다 완만하면(예: -6% > -20%) 스킵
  if (impactPct > IMPACT_THRESHOLD) {
    console.log(`[daily] 예상 ${Math.round(impactPct * 100)}% — 임계 미달, 스킵`);
    return { triggered: false, impactPct };
  }

  const proposal = await generate(ctx);
  const campaign = await save(ctx.store.id, todayYmdKst(), ctx.weather, proposal);
  console.log(`[daily] 예상 ${Math.round(impactPct * 100)}% — 발동, campaign ${campaign.id}`);
  return { triggered: true, impactPct, campaignId: campaign.id };
}
