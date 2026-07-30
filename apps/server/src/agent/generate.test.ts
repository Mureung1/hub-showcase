import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis } from "shared";
import {
  buildProposalPrompt,
  generateProposal,
  buildFallbackProposal,
  type ProposalContext,
} from "./generate";
import { checkGuardrails } from "./guardrails";
import { checkProposalQuality } from "./quality";

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
  normalRevenue: 893117,
  rainImpactPct: -0.22,
  estimated: false,
  sampleDays: 29,
  campaignDays: 0,
  baselineExcludesCampaigns: false,
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
        copy: "☔ 비 오는 오늘, 픽업 1,000원 할인!",
        promo: { type: "할인", value: "픽업 1,000원 할인" },
        channels: ["dangol", "instagram"],
      }),
    );
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller });
    expect(proposal.title).toBe("비 오는 날 픽업 할인");
    expect(proposal.promo.value).toBe("픽업 1,000원 할인");
    expect(proposal.channels).toContain("dangol");
    expect(caller).toHaveBeenCalledOnce();
  });

  it("copy와 promo의 할인액이 어긋나면 copy 기준으로 맞춰 저장한다 (재생성하지 않음)", async () => {
    // 실측 회귀(2026-07-22 저장분)를 금액권 규칙에 맞춰 옮긴 것. 원본은 copy 15% / promo 21%였다.
    // 스키마·형태는 멀쩡하니 통째로 버리지 않고 숫자만 맞춘다. 3,500원은 상한 초과라
    // 맞추지 않으면 가드레일에 걸려 멀쩡한 제안이 폴백으로 떨어진다.
    // (정률끼리의 정렬 동작 자체는 promoSync.test.ts가 단위로 계속 검증한다.)
    const caller = vi.fn(async () =>
      JSON.stringify({
        title: "비 오는 날 픽업 할인",
        copy: "☔ 오늘 픽업 주문 2,000원 할인해 드려요!",
        promo: { type: "할인", value: "픽업 3,500원 할인" },
        channels: ["dangol"],
      }),
    );
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller });
    expect(proposal.promo.value).toBe("픽업 2,000원 할인");
    expect(proposal.copy).toContain("2,000원 할인");
    expect(caller).toHaveBeenCalledOnce(); // 재생성 없음
  });

  it("apiKey가 없으면 예외", async () => {
    await expect(
      generateProposal(ctx, { apiKey: "", caller: vi.fn() }),
    ).rejects.toThrow(/GROQ_API_KEY/);
  });

  const valid = JSON.stringify({
    title: "정상 제안",
    copy: "정상 문구",
    promo: { type: "할인", value: "1,000원 할인" },
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

  it("스키마는 맞지만 가드레일 위반(할인율 30%)이면 재생성한다", async () => {
    let calls = 0;
    const over = JSON.stringify({
      title: "떨이",
      copy: "오늘만 30% 할인!",
      promo: { type: "할인", value: "30% 할인" },
      channels: ["dangol"],
    });
    const c = vi.fn(async () => (calls++ === 0 ? over : valid));
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("정상 제안");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("copy에 한자가 섞이면 재생성한다 (실측 회귀: 2026-07-26 저장분)", async () => {
    // 예전엔 가드레일만 검사해서, quality.ts에 한국어 검사가 있는데도 그대로 저장됐다.
    let calls = 0;
    const han = JSON.stringify({
      title: "비 오는 날 카페 픽업 할인",
      copy: "☔ 비 오는 오늘 10% 할인된 가격에 즐기세요! 🎉今日의 주문은 픽업으로 받아보세요!",
      promo: { type: "할인", value: "1,000원 할인" },
      channels: ["dangol"],
    });
    const c = vi.fn(async () => (calls++ === 0 ? han : valid));
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("정상 제안");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("copy에 러시아어가 섞이면 재생성한다 (실측 회귀: 2026-07-30 유출분)", async () => {
    // 옛 검사는 한자·가나·라틴만 보는 금지 목록이라 키릴이 그대로 통과해 저장됐다.
    let calls = 0;
    const ru = JSON.stringify({
      title: "흐린 날 커피 한잔",
      copy: "흐린 오늘, 김사장 카페에서 따뜻한 커피 한잔 어떠세요? ☕️ 오늘 주문하시면 스콘 1개 бесплат로 드립니다! 🥐",
      promo: { type: "할인", value: "1,000원 할인" },
      channels: ["dangol"],
    });
    const c = vi.fn(async () => (calls++ === 0 ? ru : valid));
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("정상 제안");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("재생성까지 러시아어면 한국어 템플릿으로 폴백한다", async () => {
    // 사용자 요구("다른 언어가 포함되면 폴백")가 끝까지 지켜지는지 — 2회 모두 오염된 경우.
    const ru = JSON.stringify({
      title: "무료 스콘",
      copy: "스콘 1개 бесплат로 드립니다!",
      promo: { type: "할인", value: "1,000원 할인" },
      channels: ["dangol"],
    });
    const c = vi.fn(async () => ru);
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(c).toHaveBeenCalledTimes(2);
    expect(proposal.copy).not.toContain("бесплат");
    expect(checkProposalQuality(proposal, ctx.store.name).ok).toBe(true);
  });

  it("허용 안 된 채널이면 재생성한다", async () => {
    let calls = 0;
    const bad = JSON.stringify({
      title: "정상 제안",
      copy: "정상 문구",
      promo: { type: "할인", value: "1,000원 할인" },
      channels: ["facebook"],
    });
    const c = vi.fn(async () => (calls++ === 0 ? bad : valid));
    await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("손님 문구에 내부 정보(매출·하락)가 새면 재생성한다", async () => {
    let calls = 0;
    const leak = JSON.stringify({
      title: "정상 제안",
      copy: "비 오는 날 매출이 걱정이라 준비했어요",
      promo: { type: "할인", value: "1,000원 할인" },
      channels: ["dangol"],
    });
    const c = vi.fn(async () => (calls++ === 0 ? leak : valid));
    await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("재생성까지 실패하면 템플릿 폴백을 반환한다 (에러로 죽지 않음)", async () => {
    const c = vi.fn(async () => "계속 깨진 응답");
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    // 비 오는 날씨(ctx.weather.isPrecipitating=true) 폴백
    expect(proposal.title).toBe("비 오는 날 픽업 1,000원 할인");
    expect(c).toHaveBeenCalledTimes(2);
  });

  it("LLM 호출이 예외를 던져도 폴백으로 복구한다", async () => {
    const c = vi.fn(async () => {
      throw new Error("network");
    });
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller: c });
    expect(proposal.title).toBe("비 오는 날 픽업 1,000원 할인");
    expect(c).toHaveBeenCalledTimes(2);
  });
});

describe("buildFallbackProposal", () => {
  it("비 오는 날은 픽업 문구, 쿠폰은 금액권이고 3,000원 이하", () => {
    const p = buildFallbackProposal(ctx);
    expect(p.title).toBe("비 오는 날 픽업 1,000원 할인");
    expect(p.promo.value).toContain("1,000원 할인");
    expect(p.channels).toContain("dangol");
  });

  it("맑은 날은 방문 문구", () => {
    const p = buildFallbackProposal({
      ...ctx,
      weather: { ...weather, isPrecipitating: false, condition: "clear" },
    });
    expect(p.title).toBe("오늘의 방문 1,000원 할인");
  });

  it("폴백은 문구와 쿠폰이 같은 금액을 말한다", () => {
    // 폴백은 검사 없이 반환되므로, 여기서 어긋나면 손님에게 서로 다른 혜택이 나간다.
    const p = buildFallbackProposal(ctx);
    expect(p.copy).toContain("1,000원 할인");
    expect(p.promo.value).toContain("1,000원 할인");
  });

  it("폴백 제안은 가드레일을 통과한다", () => {
    expect(checkGuardrails(buildFallbackProposal(ctx)).ok).toBe(true);
  });

  it("폴백 제안은 품질검사도 통과한다 (파이프라인이 품질로 채택 판정하므로)", () => {
    // 폴백은 검사 없이 반환되니, 이게 깨지면 우리 루브릭이 거부할 제안을 우리가 내보낸다.
    const q = checkProposalQuality(buildFallbackProposal(ctx), ctx.store.name);
    expect(q.violations).toEqual([]);
  });
});
