import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis } from "shared";
import { buildProposalPrompt, generateProposal, type ProposalContext } from "./generate";

const weather: EnsembleWeather = {
  tempC: 18,
  humidity: 85,
  precipitationMm: 6,
  precipitationProb: 80,
  isPrecipitating: true,
  condition: "rain",
  sources: ["kma", "owm"],
  sourceCount: 2,
};

const diagnosis: Diagnosis = {
  baselineRevenue: 840000,
  rainImpactPct: -0.22,
  estimated: false,
  sampleDays: 29,
  byCondition: [],
};

const ctx: ProposalContext = {
  store: { name: "김사장 카페", category: "카페", menuTags: ["아메리카노", "스콘"], tone: "친근" },
  weather,
  diagnosis,
};

describe("buildProposalPrompt", () => {
  it("매장·날씨·진단 수치를 프롬프트에 담는다", () => {
    const p = buildProposalPrompt(ctx);
    expect(p).toContain("김사장 카페");
    expect(p).toContain("아메리카노");
    expect(p).toContain("-22%");
    expect(p).toContain("비/눈 있음");
    expect(p).toContain("(실측)");
  });

  it("강수확률이 null이면 '정보없음'으로 표기한다", () => {
    const p = buildProposalPrompt({ ...ctx, weather: { ...weather, precipitationProb: null } });
    expect(p).toContain("강수확률 정보없음");
  });
});

describe("generateProposal", () => {
  it("LLM 응답 JSON을 Proposal로 파싱한다", async () => {
    const caller = vi.fn(async () =>
      JSON.stringify({
        title: "비 오는 날 픽업 할인",
        copy: "☔ 비 오는 오늘, 픽업 10% 할인!",
        promo: { type: "할인", value: "픽업 10% 할인" },
        channels: ["dangol", "instagram"],
      }),
    );
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller });
    expect(proposal.title).toBe("비 오는 날 픽업 할인");
    expect(proposal.promo.value).toBe("픽업 10% 할인");
    expect(proposal.channels).toContain("dangol");
    expect(caller).toHaveBeenCalledOnce();
  });

  it("apiKey가 없으면 예외", async () => {
    await expect(
      generateProposal(ctx, { apiKey: "", caller: vi.fn() }),
    ).rejects.toThrow(/GROQ_API_KEY/);
  });
});
