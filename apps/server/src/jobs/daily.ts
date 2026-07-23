import type { EnsembleWeather, Proposal } from "shared";
import { expectedImpactPct } from "../agent/diagnose";
import {
  collectStoreContext,
  proposalFromContext,
  type StoreContext,
} from "../agent/pipeline";
import {
  getFirstStore,
  getStoreById,
  getTodayCampaign,
  saveTodayCampaign,
  todayYmdKst,
  type CampaignRow,
  type StoreRow,
} from "../db/queries";
import { sendSms } from "../sms/solapi";

/**
 * 자동 제안 잡 2종.
 *
 * 1) 06:30 크론 잡 `runDailyProposalJob` (2-6) — 원설계(상시 서버 가정). 예상 하락이
 *    임계(−20%) 이상인 날만 생성·저장하고 사장님 문자 알림(3-8)까지 보낸다.
 *    평범한 날엔 조용히 스킵 — 마케팅 남발 방지(카니발라이제이션 통제).
 *    무료 플랜(로컬·Render free)에선 06:30에 서버가 꺼져 있어 사실상 안 돌지만,
 *    상시 서버로 옮기면 그대로 쓸 수 있게 구현을 유지한다.
 * 2) 기동 잡 `runBootProposalJob` — 무료 플랜 실운영 경로. 서버를 켤 때마다 그 시점에
 *    날씨분석+매출진단 후 임계 없이 항상 제안을 생성한다(문자 없음, 화면 표시만).
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
  /** 임계 발동 시 사장님 알림(3-8). 기본은 OWNER_PHONE/SOLAPI_TEST_TO로 운영 문자 발송. */
  notify?: (impactPct: number) => Promise<void>;
}

/**
 * 사장님 아침 알림 (3-8) — 운영 알림이라 (광고)·수신동의 대상 아님(단골 광고와 구분).
 * 수신번호(OWNER_PHONE/SOLAPI_TEST_TO)가 없으면 조용히 스킵.
 */
async function notifyOwner(impactPct: number): Promise<void> {
  const to = process.env.OWNER_PHONE ?? process.env.SOLAPI_TEST_TO;
  if (!to) return;
  const pct = Math.round(impactPct * 100);
  await sendSms(
    to,
    `[WeatherPilot] 오늘 날씨로 매출 약 ${pct}% 하락 예상. 방어 마케팅 제안을 준비해뒀어요. 앱에서 검토·발송하세요.`,
    "WeatherPilot 알림",
  );
}

export interface DailyJobResult {
  triggered: boolean;
  impactPct: number;
  campaignId?: string;
}

/** 아침 크론 잡 실행 시각 (KST). index.ts 크론 표현식도 이 값으로 만든다. */
export const JOB_TIME_KST = { hour: 6, minute: 30 };

export interface BootJobDeps {
  findStore?: (storeId?: string) => Promise<StoreRow>;
  findToday?: (storeId: string, date: string) => Promise<CampaignRow | null>;
  collect?: (storeId?: string) => Promise<StoreContext>;
  generate?: (ctx: StoreContext) => Promise<Proposal>;
  save?: (
    storeId: string,
    date: string,
    weather: StoreContext["weather"],
    proposal: Proposal,
  ) => Promise<CampaignRow>;
}

export type BootJobResult =
  | { ran: false; reason: "owner-touched" | "weather-unchanged" | "fewer-sources" }
  | { ran: true; campaignId: string; refreshed: boolean };

/** 저장된 캠페인 날씨와 지금 날씨의 '체감 조건'이 같은지 (상태·강수 여부만 비교, 기온 변화는 무시). */
function sameWeatherKind(saved: EnsembleWeather | null, now: EnsembleWeather): boolean {
  return (
    saved !== null &&
    saved.condition === now.condition &&
    saved.isPrecipitating === now.isPrecipitating
  );
}

/**
 * 서버 기동 잡 — 켤 때마다 그 시점에 오늘 제안을 만든다 (무료 플랜 실운영 경로).
 * - 오늘 캠페인이 없으면 임계(−20%) 판정 없이 항상 생성, 문자 알림 없음.
 * - draft인데 날씨 조건(condition·강수)이 생성 시점과 달라졌으면 재생성 —
 *   아침 "흐림" 문구가 오후에 비 와도 그대로 남는 문제 방지.
 * - 사장님이 손댄 캠페인(approved/sent 등)은 절대 덮지 않는다 —
 *   saveTodayCampaign은 upsert라 다시 만들면 draft로 리셋되기 때문.
 * - 날씨가 그대로면 스킵 — tsx watch 재시작마다 LLM 재호출 방지.
 */
export async function runBootProposalJob(
  storeId?: string,
  deps: BootJobDeps = {},
): Promise<BootJobResult> {
  const findStore = deps.findStore ?? ((id?: string) => (id ? getStoreById(id) : getFirstStore()));
  const findToday = deps.findToday ?? getTodayCampaign;
  const collect = deps.collect ?? collectStoreContext;
  const generate = deps.generate ?? proposalFromContext;
  const save = deps.save ?? saveTodayCampaign;

  const store = await findStore(storeId);
  const existing = await findToday(store.id, todayYmdKst());
  if (existing && existing.status !== "draft") return { ran: false, reason: "owner-touched" };

  const ctx = await collect(store.id);
  if (existing) {
    if (sameWeatherKind(existing.weather, ctx.weather)) {
      return { ran: false, reason: "weather-unchanged" };
    }
    // 날씨가 달라 보여도 소스가 줄었으면(예: KMA 실패로 OWM 단독) 오판일 수 있다 —
    // 2소스로 만든 제안을 1소스 값으로 덮지 않는다. 소스가 복구되면 다음 기동에 갱신된다.
    if (ctx.weather.sourceCount < (existing.weather?.sourceCount ?? 0)) {
      return { ran: false, reason: "fewer-sources" };
    }
  }

  const proposal = await generate(ctx);
  const campaign = await save(store.id, todayYmdKst(), ctx.weather, proposal);
  return { ran: true, campaignId: campaign.id, refreshed: existing !== null };
}

export async function runDailyProposalJob(
  storeId?: string,
  deps: DailyJobDeps = {},
): Promise<DailyJobResult> {
  const collect = deps.collect ?? collectStoreContext;
  const generate = deps.generate ?? proposalFromContext;
  const save = deps.save ?? saveTodayCampaign;
  const notify = deps.notify ?? notifyOwner;

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
  try {
    await notify(impactPct); // 사장님 운영 알림 — 실패해도 잡은 성공 처리
  } catch (e) {
    console.error("[daily] 알림 실패:", e instanceof Error ? e.message : e);
  }
  return { triggered: true, impactPct, campaignId: campaign.id };
}
