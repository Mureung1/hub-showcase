import { describe, it, expect } from "vitest";
import type {
  EnsembleWeather,
  Diagnosis,
  Proposal,
  ConditionImpact,
  WeatherCondition,
  WeatherSource,
} from "shared";
import { SCENARIOS } from "../mocks/scenarios";
import { scenarioFromApi } from "./todayScenario";

/**
 * scenarioFromApi 단위 테스트.
 * 내부 헬퍼(baseKeyFor·todayImpactPct·signedPct 등)는 비공개라 공개 함수를 통해 전 분기를 커버한다.
 * 외부 의존성이 없는 순수 함수 — 모킹 없음.
 *
 * 주의: 기대 문자열의 음수 부호는 하이픈(-)이 아니라 U+2212(−)다 (signedPct 구현과 동일).
 */

// ---- 픽스처 빌더 (기본값 + override) ----------------------------------------

function makeWeather(over: Partial<EnsembleWeather> = {}): EnsembleWeather {
  return {
    tempC: 22,
    humidity: 50,
    precipitationMm: 0,
    precipitationProb: 10,
    isPrecipitating: false,
    condition: "clear",
    sources: ["kma", "owm"],
    sourceCount: 2,
    ...over,
  };
}

function makeDiagnosis(over: Partial<Diagnosis> = {}): Diagnosis {
  return {
    baselineRevenue: 800000,
    normalRevenue: 800000, // 매출 타일은 전체 평균이 아니라 평상시(무강수) 평균 기준
    rainImpactPct: -0.22,
    estimated: false,
    sampleDays: 30,
    campaignDays: 0,
    baselineExcludesCampaigns: false,
    byCondition: [],
    ...over,
  };
}

function makeProposal(over: Partial<Proposal> = {}): Proposal {
  return {
    title: "테스트 캠페인",
    copy: "테스트 문구",
    promo: { type: "할인", value: "10% 할인" },
    channels: ["dangol"],
    ...over,
  };
}

/** byCondition 항목 축약 생성 (avgRevenue·days는 scenarioFromApi가 안 씀). */
function impact(condition: WeatherCondition, deltaPct: number): ConditionImpact {
  return { condition, deltaPct, avgRevenue: 0, days: 5 };
}

// ---- A. 정상 케이스 ----------------------------------------------------------

describe("A. 정상 케이스", () => {
  it("A1: 비 오는 날 하락(실측) — 매출 계산·방어선·down 톤·실측 문구", () => {
    const weather = makeWeather({
      condition: "rain",
      isPrecipitating: true,
      tempC: 18.2,
      humidity: 85,
      precipitationMm: 6,
    });
    const diagnosis = makeDiagnosis({ byCondition: [impact("rain", -0.18)] });

    const s = scenarioFromApi(weather, makeProposal(), diagnosis);

    expect(s.normalSales).toBe(800000);
    expect(s.predSales).toBe(656000); // 800,000 × (1 − 0.18)
    expect(s.target).toBe(744000); // 800,000 × (1 − 0.07) — DEFENSE_FLOOR 방어
    expect(s.diagTone).toBe("down");
    expect(s.todayDown).toBe(true);
    expect(s.diagText).toBe("비 평균 −18%");
    expect(s.impHead).toBe("이 가게 데이터 기준 −18% 예상");
    expect(s.impDetail).toContain("캠페인 없던 30일"); // 실측(estimated=false) 분기
    expect(s.emoji).toBe("🌧️");
  });

  it("A2: 맑은 날 상승(실측) — up 톤, 클램프는 하락에만 작동", () => {
    const diagnosis = makeDiagnosis({ byCondition: [impact("clear", 0.12)] });

    const s = scenarioFromApi(makeWeather(), makeProposal(), diagnosis);

    expect(s.predSales).toBe(896000); // 800,000 × 1.12
    expect(s.target).toBe(s.predSales); // 상승 시 방어선 미작동
    expect(s.diagTone).toBe("up");
    expect(s.todayDown).toBe(false);
    expect(s.impHead).toBe("이 가게 데이터 기준 +12% 기대");
  });

  it("A3: 실데이터가 mock base를 덮는다 — title·copy·temp·cond·sourceLabel", () => {
    const weather = makeWeather({ tempC: 26.5, humidity: 61.4 });
    const proposal = makeProposal({ title: "실제 제목", copy: "실제 카피" });

    const s = scenarioFromApi(weather, proposal, makeDiagnosis());

    expect(s.title).toBe("실제 제목");
    expect(s.copy).toBe("실제 카피");
    expect(s.title).not.toBe(SCENARIOS.sunny.title);
    expect(s.temp).toBe("27°C");
    expect(s.cond).toBe("맑음 · 습도 61%"); // 무강수 → 강수량 표기 없음
    expect(s.sourceLabel).toBe("기상청·OpenWeather 2개 소스 평균");
  });

  it("A4: bars만 mock 플레이스홀더로 남는다 (rain 날씨 → SCENARIOS.rain.bars)", () => {
    const weather = makeWeather({ condition: "rain", isPrecipitating: true, tempC: 18 });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.bars).toEqual(SCENARIOS.rain.bars);
    expect(s.barToday).toBe(SCENARIOS.rain.barToday);
  });
});

// ---- B. delta 산출 분기 (todayImpactPct) ------------------------------------

describe("B. delta 산출 분기", () => {
  it("B1: byCondition 미스 + 강수 → rainImpactPct 폴백", () => {
    const weather = makeWeather({ condition: "shower", isPrecipitating: true });
    // byCondition엔 rain만 있어 shower는 미스 → rainImpactPct(-0.22) 사용
    const diagnosis = makeDiagnosis({
      rainImpactPct: -0.22,
      byCondition: [impact("rain", -0.18)],
    });

    const s = scenarioFromApi(weather, makeProposal(), diagnosis);

    expect(s.predSales).toBe(624000); // 800,000 × 0.78
    expect(s.diagText).toBe("소나기 평균 −22%");
  });

  it("B2: byCondition 미스 + 무강수 → delta 0 → flat 문구·매출 동일", () => {
    const weather = makeWeather({ condition: "overcast" });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.diagText).toBe("흐림 · 평균과 비슷");
    expect(s.impHead).toBe("이 가게 데이터 기준 평균 수준");
    expect(s.predSales).toBe(800000);
    expect(s.target).toBe(800000);
    expect(s.diagTone).toBe("up");
  });

  it("B3: byCondition 매칭이 rainImpactPct보다 우선", () => {
    const weather = makeWeather({ condition: "rain", isPrecipitating: true });
    const diagnosis = makeDiagnosis({
      rainImpactPct: -0.22,
      byCondition: [impact("rain", -0.1)],
    });

    const s = scenarioFromApi(weather, makeProposal(), diagnosis);

    expect(s.predSales).toBe(720000); // −10% 채택 (−22% 아님)
    expect(s.diagText).toBe("비 평균 −10%");
  });
});

// ---- C. 경계값 ---------------------------------------------------------------

describe("C. 경계값", () => {
  it("C1: delta가 정확히 −7%(방어선) → target == predSales", () => {
    const diagnosis = makeDiagnosis({ byCondition: [impact("clear", -0.07)] });

    const s = scenarioFromApi(makeWeather(), makeProposal(), diagnosis);

    expect(s.predSales).toBe(744000);
    expect(s.target).toBe(744000); // 클램프 경계에서 무손실
  });

  it("C2: delta −8% → predSales는 −8%, target은 −7%로 방어", () => {
    const diagnosis = makeDiagnosis({ byCondition: [impact("clear", -0.08)] });

    const s = scenarioFromApi(makeWeather(), makeProposal(), diagnosis);

    expect(s.predSales).toBe(736000); // 800,000 × 0.92
    expect(s.target).toBe(744000); // 800,000 × 0.93
  });

  it("C3: flat 반올림 경계 — ±0.4%는 flat, +0.5%는 +1%", () => {
    const flatPlus = scenarioFromApi(
      makeWeather(),
      makeProposal(),
      makeDiagnosis({ byCondition: [impact("clear", 0.004)] }),
    );
    expect(flatPlus.diagText).toBe("맑음 · 평균과 비슷");

    const onePct = scenarioFromApi(
      makeWeather(),
      makeProposal(),
      makeDiagnosis({ byCondition: [impact("clear", 0.005)] }),
    );
    expect(onePct.diagText).toBe("맑음 평균 +1%");

    // 회귀: 반올림상 0%인 미세 음수는 down 배지가 아니어야 한다 (flat/tone 모순 수정)
    const flatMinus = scenarioFromApi(
      makeWeather(),
      makeProposal(),
      makeDiagnosis({ byCondition: [impact("clear", -0.004)] }),
    );
    expect(flatMinus.diagText).toBe("맑음 · 평균과 비슷");
    expect(flatMinus.diagTone).toBe("up");
    expect(flatMinus.todayDown).toBe(false);

    // 문서화: JS Math.round(-0.5)는 −0이라 −0.5%도 flat (양수 +0.5%와 비대칭)
    const halfMinus = scenarioFromApi(
      makeWeather(),
      makeProposal(),
      makeDiagnosis({ byCondition: [impact("clear", -0.005)] }),
    );
    expect(halfMinus.diagText).toBe("맑음 · 평균과 비슷");
  });

  it("C4: baseKeyFor 온도 경계 — 33°C(heat)·32.9°C(sunny)·0°C(cold)·0.1°C(sunny)", () => {
    const at = (tempC: number) =>
      scenarioFromApi(makeWeather({ tempC }), makeProposal(), makeDiagnosis());

    expect(at(33).bars).toEqual(SCENARIOS.heat.bars); // >= 33 → heat
    expect(at(32.9).bars).toEqual(SCENARIOS.sunny.bars);
    expect(at(0).bars).toEqual(SCENARIOS.cold.bars); // <= 0 → cold
    expect(at(0.1).bars).toEqual(SCENARIOS.sunny.bars);
  });

  it("C5: baseKeyFor 우선순위 — snow·강수가 폭염 온도보다 우선", () => {
    const snowHot = scenarioFromApi(
      makeWeather({ condition: "snow", isPrecipitating: true, tempC: 35 }),
      makeProposal(),
      makeDiagnosis(),
    );
    expect(snowHot.bars).toEqual(SCENARIOS.cold.bars); // snow > heat

    const rainHot = scenarioFromApi(
      makeWeather({ condition: "rain", isPrecipitating: true, tempC: 35 }),
      makeProposal(),
      makeDiagnosis(),
    );
    expect(rainHot.bars).toEqual(SCENARIOS.rain.bars); // 강수 > heat
  });

  it("C6: 표기 반올림 — 기온·습도·강수량", () => {
    const weather = makeWeather({
      condition: "rain",
      isPrecipitating: true,
      tempC: 26.5,
      humidity: 61.4,
      precipitationMm: 3.6,
    });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.temp).toBe("27°C");
    expect(s.cond).toBe("비 · 습도 61% · 강수 4mm/h");
  });
});

// ---- D. 빈 값·결측 -----------------------------------------------------------

describe("D. 빈 값·결측", () => {
  it("D1: estimated=true → 업종 평균 추정 안내 문구", () => {
    const diagnosis = makeDiagnosis({ estimated: true, sampleDays: 3 });

    const s = scenarioFromApi(makeWeather(), makeProposal(), diagnosis);

    expect(s.impDetail).toContain("아직 매출 데이터가 적어");
    expect(s.impDetail).toContain("업종 평균으로 추정");
  });

  it("D2: sources 빈 배열 → '단일 소스'", () => {
    const weather = makeWeather({ sources: [], sourceCount: 0 });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.sourceLabel).toBe("단일 소스");
  });

  it("D3: sourceCount=0이면 sources 길이로 폴백", () => {
    const weather = makeWeather({ sources: ["kma"], sourceCount: 0 });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.sourceLabel).toBe("기상청 1개 소스 평균");
  });

  it("D4: channels 빈 배열·전부 무효 → dangol 폴백, 혼합 → 유효만 통과", () => {
    const run = (channels: string[]) =>
      scenarioFromApi(makeWeather(), makeProposal({ channels }), makeDiagnosis()).channels;

    expect(run([])).toEqual(["dangol"]);
    expect(run(["kakao", "facebook"])).toEqual(["dangol"]);
    expect(run(["instagram", "kakao"])).toEqual(["instagram"]);
  });

  it("D5: promo.value가 빈 문자열이면 type으로 폴백", () => {
    const proposal = makeProposal({ promo: { type: "할인", value: "" } });

    const s = scenarioFromApi(makeWeather(), proposal, makeDiagnosis());

    expect(s.promo).toBe("할인");
  });

  it("D6: normalRevenue 0 → 매출 타일 전부 0, NaN 미발생", () => {
    const diagnosis = makeDiagnosis({
      baselineRevenue: 0,
      normalRevenue: 0,
      byCondition: [impact("clear", -0.18)],
    });

    const s = scenarioFromApi(makeWeather(), makeProposal(), diagnosis);

    expect(s.normalSales).toBe(0);
    expect(s.predSales).toBe(0);
    expect(s.target).toBe(0);
  });
});

// ---- E. 이상 입력 (서버-FE 버전 불일치 시 현재 동작 문서화) -------------------

describe("E. 이상 입력", () => {
  it("E1: 알 수 없는 condition → TypeError (COND_META 미등록 — 현재 방어 없음)", () => {
    const weather = makeWeather({ condition: "hail" as WeatherCondition });

    expect(() => scenarioFromApi(weather, makeProposal(), makeDiagnosis())).toThrow(TypeError);
  });

  it("E2: 알 수 없는 source → 코드 그대로 표기 (?? 폴백으로 안 죽음)", () => {
    const weather = makeWeather({ sources: ["darksky" as WeatherSource], sourceCount: 1 });

    const s = scenarioFromApi(weather, makeProposal(), makeDiagnosis());

    expect(s.sourceLabel).toBe("darksky 1개 소스 평균");
  });
});
