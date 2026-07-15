import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis, Proposal } from "shared";
import { runDailyProposalJob } from "./daily";
import type { StoreContext } from "../agent/pipeline";
import type { StoreRow, CampaignRow } from "../db/queries";

const store = { id: "s1", name: "김사장 카페", category: "카페" } as StoreRow;

function ctxWith(condition: EnsembleWeather["condition"], isPrecipitating: boolean, deltaPct: number): StoreContext {
  const weather = { condition, isPrecipitating } as EnsembleWeather;
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
