import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis, Proposal } from "shared";
import { runDailyProposalJob, runBootProposalJob } from "./daily";
import type { StoreContext } from "../agent/pipeline";
import type { StoreRow, CampaignRow } from "../db/queries";

const store = { id: "s1", name: "김사장 카페", category: "카페" } as StoreRow;

function ctxWith(
  condition: EnsembleWeather["condition"],
  isPrecipitating: boolean,
  deltaPct: number,
  sourceCount = 2,
): StoreContext {
  const weather = { condition, isPrecipitating, sourceCount } as EnsembleWeather;
  const diagnosis: Diagnosis = {
    baselineRevenue: 840000,
    rainImpactPct: -0.22,
    estimated: false,
    sampleDays: 29,
    byCondition: [{ condition, avgRevenue: 700000, deltaPct, days: 5 }],
  };
  return { store, weather, diagnosis };
}

const proposal: Proposal = {
  title: "t",
  copy: "c",
  promo: { type: "할인", value: "10% 할인" },
  channels: ["dangol"],
};

describe("runDailyProposalJob", () => {
  it("예상 하락이 임계(-20%) 이상이면 생성·저장한다", async () => {
    const generate = vi.fn(async () => proposal);
    const save = vi.fn(async () => ({ id: "camp1" }) as CampaignRow);
    const collect = vi.fn(async () => ctxWith("rain", true, -0.22)); // -22% ≤ -20% → 발동

    const r = await runDailyProposalJob(undefined, { collect, generate, save });
    expect(r.triggered).toBe(true);
    expect(r.campaignId).toBe("camp1");
    expect(generate).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
  });

  it("하락이 임계보다 완만하면 스킵한다 (생성·저장 안 함)", async () => {
    const generate = vi.fn(async () => proposal);
    const save = vi.fn(async () => ({ id: "camp1" }) as CampaignRow);
    const collect = vi.fn(async () => ctxWith("overcast", false, -0.06)); // -6% > -20% → 스킵

    const r = await runDailyProposalJob(undefined, { collect, generate, save });
    expect(r.triggered).toBe(false);
    expect(r.campaignId).toBeUndefined();
    expect(generate).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("정확히 -20%면 발동한다 (경계값)", async () => {
    const collect = vi.fn(async () => ctxWith("cloudy", false, -0.2));
    const r = await runDailyProposalJob(undefined, {
      collect,
      generate: async () => proposal,
      save: async () => ({ id: "c" }) as CampaignRow,
    });
    expect(r.triggered).toBe(true);
  });
});

describe("runBootProposalJob (서버 기동 잡)", () => {
  // 저장된 캠페인 mock — 상태와 생성 시점 날씨만 지정
  const saved = (
    status: string,
    condition: EnsembleWeather["condition"],
    isPrecipitating: boolean,
    sourceCount = 2,
  ) => ({ id: "camp1", status, weather: { condition, isPrecipitating, sourceCount } }) as CampaignRow;

  it("오늘 캠페인이 없으면 임계와 무관하게 항상 생성·저장한다", async () => {
    // -6%짜리 평범한 날 — 크론 잡이라면 임계 미달 스킵이지만 기동 잡은 생성한다
    const save = vi.fn(async () => ({ id: "camp1" }) as CampaignRow);
    const r = await runBootProposalJob(undefined, {
      findStore: async () => store,
      findToday: async () => null,
      collect: async () => ctxWith("overcast", false, -0.06),
      generate: async () => proposal,
      save,
    });
    expect(r).toEqual({ ran: true, campaignId: "camp1", refreshed: false });
    expect(save).toHaveBeenCalledOnce();
  });

  it("draft인데 날씨 조건이 달라졌으면 재생성한다 (흐림 → 비)", async () => {
    const save = vi.fn(async () => ({ id: "camp1" }) as CampaignRow);
    const r = await runBootProposalJob(undefined, {
      findStore: async () => store,
      findToday: async () => saved("draft", "overcast", false),
      collect: async () => ctxWith("rain", true, -0.22),
      generate: async () => proposal,
      save,
    });
    expect(r).toEqual({ ran: true, campaignId: "camp1", refreshed: true });
    expect(save).toHaveBeenCalledOnce();
  });

  it("draft이고 날씨도 그대로면 유지한다 (재시작마다 LLM 재호출 방지)", async () => {
    const generate = vi.fn(async () => proposal);
    const r = await runBootProposalJob(undefined, {
      findStore: async () => store,
      findToday: async () => saved("draft", "overcast", false),
      collect: async () => ctxWith("overcast", false, -0.06),
      generate,
    });
    expect(r).toEqual({ ran: false, reason: "weather-unchanged" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("날씨 소스가 줄었으면 달라 보여도 덮지 않는다 (KMA 실패 오판 방지)", async () => {
    const generate = vi.fn(async () => proposal);
    const r = await runBootProposalJob(undefined, {
      findStore: async () => store,
      findToday: async () => saved("draft", "rain", true, 2), // 2소스로 만든 비 제안
      collect: async () => ctxWith("overcast", false, -0.06, 1), // OWM 단독이 "흐림" 주장
      generate,
    });
    expect(r).toEqual({ ran: false, reason: "fewer-sources" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("승인·발송된 캠페인은 날씨가 바뀌어도 덮지 않는다", async () => {
    const collect = vi.fn(async () => ctxWith("rain", true, -0.22));
    const r = await runBootProposalJob(undefined, {
      findStore: async () => store,
      findToday: async () => saved("approved", "overcast", false),
      collect,
    });
    expect(r).toEqual({ ran: false, reason: "owner-touched" });
    expect(collect).not.toHaveBeenCalled();
  });
});
