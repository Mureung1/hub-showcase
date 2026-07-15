import type { WeatherCondition, Diagnosis, ConditionImpact } from "shared";

/**
 * 매출×날씨 상관 진단.
 *
 * daily_sales 를 날씨 스냅샷과 함께 받아 "이 가게는 비 오는 날 -N%"를 실계산한다.
 * 표본이 부족하면(콜드스타트) 업종 기본 계수로 추정하고 estimated=true 를 붙인다.
 */

/** 진단 입력: 하루치 매출 + (있으면) 그날 날씨 스냅샷. */
export interface SalesWithWeather {
  revenue: number;
  weather: { condition: WeatherCondition; isPrecipitating: boolean } | null;
}

// 실측으로 인정할 최소 표본. 비/맑음 각 그룹도 최소 2일은 있어야 한다.
const MIN_WEATHER_DAYS = 7;
const MIN_GROUP_DAYS = 2;

// 콜드스타트용 업종 기본 계수 (비 오는 날 매출 영향). 실측 데이터가 쌓이면 대체된다.
const DEFAULT_RAIN_IMPACT: Record<string, number> = {
  카페: -0.15,
  식당: -0.1,
  베이커리: -0.12,
  default: -0.12,
};

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function diagnose(sales: SalesWithWeather[], category = "default"): Diagnosis {
  const baselineRevenue = Math.round(mean(sales.map((s) => s.revenue)));
  const withWeather = sales.filter(
    (s): s is SalesWithWeather & { weather: NonNullable<SalesWithWeather["weather"]> } =>
      s.weather !== null,
  );

  const rain = withWeather.filter((s) => s.weather.isPrecipitating);
  const dry = withWeather.filter((s) => !s.weather.isPrecipitating);

  // 콜드스타트: 표본이 부족하면 업종 기본 계수로 추정
  if (
    withWeather.length < MIN_WEATHER_DAYS ||
    rain.length < MIN_GROUP_DAYS ||
    dry.length < MIN_GROUP_DAYS
  ) {
    return {
      baselineRevenue,
      rainImpactPct: DEFAULT_RAIN_IMPACT[category] ?? DEFAULT_RAIN_IMPACT.default,
      estimated: true,
      sampleDays: withWeather.length,
      byCondition: [],
    };
  }

  const rainAvg = mean(rain.map((s) => s.revenue));
  const dryAvg = mean(dry.map((s) => s.revenue));
  const rainImpactPct = round2((rainAvg - dryAvg) / dryAvg);

  // 상태별 baseline 대비 편차
  const groups = new Map<WeatherCondition, number[]>();
  for (const s of withWeather) {
    const arr = groups.get(s.weather.condition) ?? [];
    arr.push(s.revenue);
    groups.set(s.weather.condition, arr);
  }
  const byCondition: ConditionImpact[] = [...groups.entries()]
    .map(([condition, revs]) => {
      const avgRevenue = Math.round(mean(revs));
      return {
        condition,
        avgRevenue,
        deltaPct: round2((avgRevenue - baselineRevenue) / baselineRevenue),
        days: revs.length,
      };
    })
    .sort((a, b) => a.deltaPct - b.deltaPct);

  return {
    baselineRevenue,
    rainImpactPct,
    estimated: false,
    sampleDays: withWeather.length,
    byCondition,
  };
}

/**
 * 오늘 날씨에 대한 예상 매출 편차(%)를 진단에서 뽑는다.
 * 오늘 상태가 byCondition에 있으면 그 편차, 없으면(콜드스타트 등)
 * 비 오는 날이면 rainImpactPct, 아니면 0.
 */
export function expectedImpactPct(
  diagnosis: Diagnosis,
  weather: { condition: WeatherCondition; isPrecipitating: boolean },
): number {
  const hit = diagnosis.byCondition.find((c) => c.condition === weather.condition);
  if (hit) return hit.deltaPct;
  return weather.isPrecipitating ? diagnosis.rainImpactPct : 0;
}
