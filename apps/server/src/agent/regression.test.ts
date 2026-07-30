import { describe, it, expect, vi } from "vitest";
import type { EnsembleWeather, Diagnosis, WeatherCondition } from "shared";
import { generateProposal, type ProposalContext } from "./generate";
import { checkProposalQuality } from "./quality";

/**
 * LLM 회귀 세트 (4-6).
 *
 * 3계층:
 *  1) 루브릭 단위 — checkProposalQuality가 각 위반을 정확히 잡는지.
 *  2) 결정론 회귀 — 가드레일로 잡히는 적대 입력을 generateProposal이 재생성/폴백으로 복구해
 *     항상 품질 통과 제안을 반환하는지 (LLM 스텁 주입, 실네트워크 없음 → CI 안정).
 *  3) 라이브 매트릭스 — 날씨×업종 실제 Groq 호출 품질 점검 (GROQ_API_KEY 있을 때만, CI 자동 skip).
 *     실행: npm run test:llm -w apps/server
 */

const baseWeather: EnsembleWeather = {
  tempC: 18,
  humidity: 70,
  precipitationMm: 0,
  precipitationProb: 20,
  isPrecipitating: false,
  condition: "clear",
  sources: ["kma", "owm"],
  sourceCount: 2,
};

const diagnosis: Diagnosis = {
  baselineRevenue: 840000,
  normalRevenue: 893117,
  rainImpactPct: -0.18,
  estimated: false,
  sampleDays: 29,
  campaignDays: 0,
  baselineExcludesCampaigns: false,
  byCondition: [],
};

const ctx: ProposalContext = {
  store: { name: "김사장 카페", category: "카페", menuTags: ["아메리카노", "스콘"], tone: "친근" },
  weather: { ...baseWeather, condition: "rain", isPrecipitating: true, precipitationMm: 6, precipitationProb: 80 },
  diagnosis,
};

/** 모든 규칙을 통과하는 깨끗한 한국어 제안(스텁 응답). */
const cleanProposal = {
  title: "비 오는 날 픽업 혜택",
  copy: "오늘 따뜻한 아메리카노 픽업으로 편하게 즐기세요 ☕",
  promo: { type: "할인", value: "픽업 10% 할인" },
  channels: ["dangol"],
};
const cleanJson = JSON.stringify(cleanProposal);

// ---- 1) 루브릭 단위 --------------------------------------------------------

describe("checkProposalQuality — 루브릭", () => {
  it("깨끗한 한국어 제안은 통과한다", () => {
    expect(checkProposalQuality(cleanProposal, "김사장 카페").ok).toBe(true);
  });

  // 한국어 검사는 "금지 목록"이 아니라 "한글만 허용" 규칙이다.
  //
  // 예전 테스트는 한자·일본어·영어 3종만 확인했다 — 구현의 금지 목록을 그대로 베낀 셈이라
  // 목록에 없는 언어는 검증할 수 없었고, 실제로 러시아어가 통과해 저장됐다(2026-07-30).
  // 그래서 스크립트를 넓게 깔아 "한글 아닌 문자는 무엇이든 잡힌다"를 규칙으로 검증한다.
  it.each([
    ["실제 유출 문구(러시아어)", "오늘 주문하시면 스콘 1개 бесплат로 드립니다! 🥐"],
    ["키릴", "бесплат 혜택"],
    ["그리스", "Ελληνικά 혜택"],
    ["아랍", "مجاني 혜택"],
    ["태국", "ไทย 할인"],
    ["히브리", "שלום 혜택"],
    ["데바나가리", "मुफ़्त 혜택"],
    ["반각 가나", "ﾊﾛｰ 혜택"],
    ["한자", "오늘 特別 할인"],
    ["일본어", "こんにちは 혜택"],
    ["영어", "Today special sale"],
  ])("한글이 아닌 문자가 섞이면 잡는다 — %s", (_name, copy) => {
    const r = checkProposalQuality({ ...cleanProposal, copy });
    expect(r.ok).toBe(false);
    expect(r.violations.join()).toContain("비한국어");
  });

  // 오탐 방지. 여기가 깨지면 멀쩡한 제안이 조용히 템플릿 폴백으로 떨어진다.
  it.each([
    ["이모지·퍼센트", "☔ 비 오는 오늘, 픽업 주문 10% 할인이에요 🎉"],
    // ☕️는 U+2615 + U+FE0F(변이선택자, 카테고리 Mn)다. 규칙에 \p{M}을 넣으면 여기서 오탐난다.
    ["변이선택자 이모지·온도", "기온 28℃ 🥐☕️ 오늘도 활짝 웃으세요"],
    ["금액·문장부호", "3,000원 할인! (광고) — 무료수신거부 가능"],
    ["자모 단독", "ㅋㅋㅋ 좋아요 ㅠㅠ"],
    ["폴백 문구(비)", "☔ 비 오는 오늘, 김사장 카페에서 따뜻하게 픽업 어떠세요?\n미리 주문하고 편하게 받아가세요 🏃"],
    ["폴백 문구(맑음)", "오늘 김사장 카페에서 특별한 혜택을 준비했어요.\n지나는 길에 편하게 들러주세요 ☕"],
  ])("정상 한국어 문구는 통과한다 — %s", (_name, copy) => {
    expect(checkProposalQuality({ ...cleanProposal, copy }).ok).toBe(true);
  });

  it("위반 메시지에 걸린 문자를 담아 무엇이 문제인지 보여준다", () => {
    const r = checkProposalQuality({ ...cleanProposal, copy: "스콘 1개 бесплат로" });
    expect(r.violations.join()).toContain("비한국어 문자(copy): б е с п л а т");
  });

  it("손님 문구에 매출·진단 등 내부 정보가 노출되면 잡는다", () => {
    const r = checkProposalQuality({ ...cleanProposal, copy: "매출 하락이 걱정돼 준비한 혜택" });
    expect(r.ok).toBe(false);
    expect(r.violations.join()).toContain("내부정보");
  });

  it("허용되지 않은 채널을 잡는다", () => {
    const r = checkProposalQuality({ ...cleanProposal, channels: ["dangol", "facebook"] });
    expect(r.ok).toBe(false);
    expect(r.violations.join()).toContain("채널");
  });

  it("할인율 20% 초과·창작 상호는 가드레일로 잡는다", () => {
    const over = checkProposalQuality({ ...cleanProposal, promo: { type: "할인", value: "30% 할인" } });
    expect(over.ok).toBe(false);

    const brand = checkProposalQuality({ ...cleanProposal, title: "그레이스카페 오늘의 혜택" }, "김사장 카페");
    expect(brand.ok).toBe(false);
    expect(brand.violations.join()).toContain("창작 상호");
  });
});

// ---- 2) 결정론 회귀 (가드레일 복구) ----------------------------------------

describe("generateProposal 회귀 — 가드레일 적대 입력에도 품질 통과 제안 반환", () => {
  const adversarialFirst: Record<string, string> = {
    "할인율 30%": JSON.stringify({ ...cleanProposal, title: "떨이", copy: "오늘만 30% 할인!", promo: { type: "할인", value: "30% 할인" } }),
    "창작 상호": JSON.stringify({ ...cleanProposal, title: "그레이스카페 오늘의 혜택" }),
    "금칙어(최고)": JSON.stringify({ ...cleanProposal, copy: "동네 최고의 커피 오늘 픽업하세요" }),
    "깨진 JSON": "{ 이건 JSON이 아님",
    "스키마 누락": JSON.stringify({ title: "제목만 있음" }),
  };

  it.each(Object.entries(adversarialFirst))(
    "1차가 '%s'여도 재생성으로 품질 통과 제안을 반환한다",
    async (_label, firstRaw) => {
      let calls = 0;
      const caller = vi.fn(async () => (calls++ === 0 ? firstRaw : cleanJson));
      const proposal = await generateProposal(ctx, { apiKey: "TEST", caller });
      expect(caller).toHaveBeenCalledTimes(2);
      expect(checkProposalQuality(proposal, ctx.store.name).ok).toBe(true);
    },
  );

  it("재생성까지 실패하면 폴백을 반환하고, 폴백도 품질을 통과한다", async () => {
    const caller = vi.fn(async () => "계속 깨진 응답");
    const proposal = await generateProposal(ctx, { apiKey: "TEST", caller });
    expect(caller).toHaveBeenCalledTimes(2);
    expect(checkProposalQuality(proposal, ctx.store.name).ok).toBe(true);
  });
});

// ---- 3) 라이브 매트릭스 (날씨×업종) — GROQ_API_KEY 있을 때만 ----------------

const weatherCases: { label: string; weather: EnsembleWeather }[] = [
  { label: "비", weather: { ...baseWeather, condition: "rain" as WeatherCondition, isPrecipitating: true, precipitationMm: 6, precipitationProb: 80, humidity: 85 } },
  { label: "맑음", weather: { ...baseWeather, condition: "clear" as WeatherCondition, tempC: 24 } },
  { label: "폭염", weather: { ...baseWeather, condition: "clear" as WeatherCondition, tempC: 35, humidity: 55 } },
  { label: "한파", weather: { ...baseWeather, condition: "snow" as WeatherCondition, tempC: -6, isPrecipitating: true, precipitationMm: 2 } },
];

const categoryCases: { category: string; menuTags: string[] }[] = [
  { category: "카페", menuTags: ["아메리카노", "스콘"] },
  { category: "식당", menuTags: ["김치찌개", "제육볶음"] },
  { category: "베이커리", menuTags: ["소금빵", "크루아상"] },
];

describe.skipIf(!process.env.GROQ_API_KEY)("LLM 라이브 매트릭스 (날씨×업종)", () => {
  it(
    "각 조합에서 생성된 제안이 품질 루브릭을 통과한다",
    async () => {
      const report: { case: string; ok: boolean; violations: string; title: string }[] = [];
      for (const w of weatherCases) {
        for (const c of categoryCases) {
          const proposal = await generateProposal({
            store: { name: "김사장 카페", category: c.category, menuTags: c.menuTags, tone: "친근" },
            weather: w.weather,
            diagnosis,
          });
          const q = checkProposalQuality(proposal, "김사장 카페");
          report.push({
            case: `${w.label}×${c.category}`,
            ok: q.ok,
            violations: q.violations.join("; "),
            title: proposal.title,
          });
        }
      }
      // eslint-disable-next-line no-console
      console.table(report);
      const failures = report.filter((r) => !r.ok);
      expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    },
    180_000,
  );
});
