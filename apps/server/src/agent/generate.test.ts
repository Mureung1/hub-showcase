import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis } from "shared";
import {
  buildProposalPrompt,
  generateProposal,
  buildFallbackProposal,
  type ProposalContext,
} from "./generate";

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

  const valid = JSON.stringify({
    title: "정상 제안",
    copy: "정상 문구",
    promo: { type: "할인", value: "10% 할인" },
    channels: ["dangol"],
  });

  it("1차 응답이 스키마 위반이면 1회 재생성 후 성공한다", async () => {
    let calls = 0;
    const c = vi.fn(async () => (calls++ === 0 ? JSON.stringify({ title: "누락" }) : valid));
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("정상 제안");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("JSON 파싱 자체가 깨져도 재생성으로 복구한다", async () => {
    let calls = 0;
    const c = vi.fn(async () => (calls++ === 0 ? "이건 JSON이 아님" : valid));
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("정상 제안");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("재생성까지 실패하면 템플릿 폴백을 반환한다 (에러로 죽지 않음)", async () => {
    const c = vi.fn(async () => "계속 깨진 응답");
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    // 비 오는 날씨(ctx.weather.isPrecipitating=true) 폴백
    expect(proposal.title).toBe("비 오는 날 픽업 혜택");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("LLM 호출이 예외를 던져도 폴백으로 복구한다", async () => {
    const c = vi.fn(async () => {
      throw new Error("network");
    });
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("비 오는 날 픽업 혜택");
    expect(c).toHaveBeenCalledTimes(2);
  });
});

describe("buildFallbackProposal", () => {
  it("비 오는 날은 픽업 문구, 할인율은 20% 이하", () => {
    const p = buildFallbackProposal(ctx);
    expect(p.title).toBe("비 오는 날 픽업 혜택");
    expect(p.promo.value).toContain("10%");
    expect(p.channels).toContain("dangol");
  });

  it("맑은 날은 방문 문구", () => {
    const p = buildFallbackProposal({
      ...ctx,
      weather: { ...weather, isPrecipitating: false, condition: "clear" },
    });
    expect(p.title).toBe("오늘의 방문 혜택");
  });
});
