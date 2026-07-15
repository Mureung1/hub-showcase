import { describe, it, expect } from "vitest";
import type { WeatherCondition, Diagnosis } from "shared";
import { diagnose, expectedImpactPct, type SalesWithWeather } from "./diagnose";

// 매출+날씨 행 빌더
function row(revenue: number, condition: WeatherCondition | null): SalesWithWeather {
  return {
    revenue,
    weather:
      condition === null
        ? null
        : { condition, isPrecipitating: condition === "rain" || condition === "shower" },
  };
}

describe("diagnose", () => {
  it("실측: 비 오는 날 매출 하락을 계산한다", () => {
    const sales: SalesWithWeather[] = [
      // 맑은 날 8일 (~100만)
      ...Array.from({ length: 8 }, () => row(1_000_000, "clear")),
      // 비 오는 날 4일 (~80만) → dry 대비 -20%
      ...Array.from({ length: 4 }, () => row(800_000, "rain")),
    ];
    const d = diagnose(sales, "카페");
    expect(d.estimated).toBe(false);
    expect(d.rainImpactPct).toBe(-0.2);
    expect(d.sampleDays).toBe(12);
    // byCondition은 편차 오름차순(가장 나쁜 날씨 먼저)
    expect(d.byCondition[0].condition).toBe("rain");
    expect(d.byCondition[0].deltaPct).toBeLessThan(0);
  });

  it("콜드스타트: 표본이 적으면 업종 기본 계수로 추정한다", () => {
    const sales = [row(900_000, "clear"), row(800_000, "rain")];
    const d = diagnose(sales, "카페");
    expect(d.estimated).toBe(true);
    expect(d.rainImpactPct).toBe(-0.15); // 카페 기본 계수
    expect(d.byCondition).toEqual([]);
  });

  it("비/맑음 한쪽 그룹이 부족하면 추정으로 처리한다", () => {
    const sales = [
      ...Array.from({ length: 10 }, () => row(1_000_000, "clear")),
      row(800_000, "rain"), // 비 1일뿐
    ];
    const d = diagnose(sales, "식당");
    expect(d.estimated).toBe(true);
    expect(d.rainImpactPct).toBe(-0.1); // 식당 기본 계수
  });

  it("날씨 스냅샷이 없는 행은 baseline엔 포함하되 날씨 분석에선 제외한다", () => {
    const sales: SalesWithWeather[] = [
      ...Array.from({ length: 8 }, () => row(1_000_000, "clear")),
      ...Array.from({ length: 4 }, () => row(800_000, "rain")),
      row(500_000, null), // CSV 업로드분(날씨 없음)
    ];
    const d = diagnose(sales, "카페");
    expect(d.sampleDays).toBe(12); // 날씨 있는 행만
    // baseline은 13개 전체 평균이라 100만보다 낮음
    expect(d.baselineRevenue).toBeLessThan(1_000_000);
  });

  it("알 수 없는 업종은 default 계수를 쓴다", () => {
    const d = diagnose([row(900_000, "clear")], "꽃집");
    expect(d.rainImpactPct).toBe(-0.12);
  });
});

describe("expectedImpactPct", () => {
  const diagnosis: Diagnosis = {
    baselineRevenue: 840000,
    rainImpactPct: -0.22,
    estimated: false,
    sampleDays: 29,
    byCondition: [
      { condition: "rain", avgRevenue: 687400, deltaPct: -0.18, days: 5 },
      { condition: "clear", avgRevenue: 948667, deltaPct: 0.13, days: 12 },
    ],
  };

  it("오늘 상태가 byCondition에 있으면 그 편차를 쓴다", () => {
    expect(expectedImpactPct(diagnosis, { condition: "rain", isPrecipitating: true })).toBe(-0.18);
    expect(expectedImpactPct(diagnosis, { condition: "clear", isPrecipitating: false })).toBe(0.13);
  });

  it("매칭이 없고 비 오면 rainImpactPct로 폴백한다", () => {
    expect(expectedImpactPct(diagnosis, { condition: "snow", isPrecipitating: true })).toBe(-0.22);
  });

  it("매칭이 없고 강수 없으면 0", () => {
    expect(expectedImpactPct(diagnosis, { condition: "overcast", isPrecipitating: false })).toBe(0);
  });
});
