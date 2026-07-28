import type { WeatherCondition, Diagnosis, ConditionImpact } from "shared";

/**
 * 매출×날씨 상관 진단.
 *
 * daily_sales 를 날씨 스냅샷과 함께 받아 "이 가게는 비 오는 날 -N%"를 실계산한다.
 * 표본이 부족하면(콜드스타트) 업종 기본 계수로 추정하고 estimated=true 를 붙인다.
 */

/** 진단 입력: 하루치 매출 + (있으면) 그날 날씨 스냅샷 + 그날 캠페인 발송 여부. */
export interface SalesWithWeather {
  revenue: number;
  weather: { condition: WeatherCondition; isPrecipitating: boolean } | null;
  /** 그날 캠페인이 실제 발송됐는지(개입일). 기준선 계산에서 제외된다. */
  hadCampaign?: boolean;
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

/** base 대비 편차 비율. base가 0이면 0 — 표본이 없거나 매출이 0인 매장에서 NaN 방지. */
const deltaAgainst = (value: number, base: number): number =>
  base === 0 ? 0 : round2((value - base) / base);

/** 날씨 스냅샷이 확인된 행 (diagnose 내부에서만 쓰는 좁힌 타입). */
type WeatherKnown = SalesWithWeather & { weather: NonNullable<SalesWithWeather["weather"]> };

/** 실측으로 인정할 표본인지 — 전체 일수와 비/맑음 각 그룹 최소치를 함께 본다. */
function hasEnoughSamples(rows: WeatherKnown[]): boolean {
  if (rows.length < MIN_WEATHER_DAYS) return false;
  const rainDays = rows.filter((s) => s.weather.isPrecipitating).length;
  return rainDays >= MIN_GROUP_DAYS && rows.length - rainDays >= MIN_GROUP_DAYS;
}

export function diagnose(sales: SalesWithWeather[], category = "default"): Diagnosis {
  const baselineRevenue = Math.round(mean(sales.map((s) => s.revenue)));
  const withWeather = sales.filter((s): s is WeatherKnown => s.weather !== null);

  const campaignDays = withWeather.filter((s) => s.hadCampaign === true).length;

  // 개입일(캠페인 발송)을 빼고 '날씨 순효과'만 잰다. 안 빼면 캠페인이 성공할수록
  // 비 오는 날 평균이 올라가 진단이 스스로를 지운다(측정 대상이 처치에 오염됨).
  //
  // 단, 빼고 나서 표본이 모자라면 통째로 되돌린다 — 오염을 피하려다 콜드스타트로 떨어지면
  // 업종 기본 계수(-0.1~-0.15)가 IMPACT_THRESHOLD(-0.2)를 못 넘어 제안이 아예 안 나간다.
  // 오염된 진단이 진단 없음보다는 낫다. 되돌렸는지는 baselineExcludesCampaigns로 알린다.
  const clean = withWeather.filter((s) => !s.hadCampaign);
  const baselineExcludesCampaigns = campaignDays > 0 && hasEnoughSamples(clean);
  const analyzed = baselineExcludesCampaigns ? clean : withWeather;

  const rain = analyzed.filter((s) => s.weather.isPrecipitating);
  const dry = analyzed.filter((s) => !s.weather.isPrecipitating);

  // 모든 편차의 기준선은 '평상시' = 무강수 평균이다. 전체 평균(baselineRevenue)을 쓰면
  // 기준선에 비 오는 날이 섞여 내려가고, 그만큼 하락폭이 실제보다 완만하게 보인다.
  // 무강수 표본이 아직 없으면(콜드스타트) 전체 평균으로 근사한다.
  const normalRevenue =
    dry.length > 0 ? Math.round(mean(dry.map((s) => s.revenue))) : baselineRevenue;

  // 콜드스타트: 표본이 부족하면 업종 기본 계수로 추정
  if (!hasEnoughSamples(analyzed)) {
    return {
      baselineRevenue,
      normalRevenue,
      rainImpactPct: DEFAULT_RAIN_IMPACT[category] ?? DEFAULT_RAIN_IMPACT.default,
      estimated: true,
      sampleDays: analyzed.length,
      campaignDays,
      baselineExcludesCampaigns,
      byCondition: [],
    };
  }

  const rainAvg = Math.round(mean(rain.map((s) => s.revenue)));
  const rainImpactPct = deltaAgainst(rainAvg, normalRevenue);

  // 상태별 평상시 대비 편차 — rainImpactPct와 같은 기준(normalRevenue)·같은 표본(analyzed)을 쓴다.
  const groups = new Map<WeatherCondition, number[]>();
  for (const s of analyzed) {
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
        deltaPct: deltaAgainst(avgRevenue, normalRevenue),
        days: revs.length,
      };
    })
    .sort((a, b) => a.deltaPct - b.deltaPct);

  return {
    baselineRevenue,
    normalRevenue,
    rainImpactPct,
    estimated: false,
    sampleDays: analyzed.length,
    campaignDays,
    baselineExcludesCampaigns,
    byCondition,
  };
}

/**
 * 오늘 날씨에 대한 예상 매출 편차(%)를 진단에서 뽑는다.
 * 오늘 상태가 byCondition에 있으면 그 편차, 없으면(콜드스타트 등)
 * 비 오는 날이면 rainImpactPct, 아니면 0.
 *
 * 두 경로 모두 normalRevenue(무강수 평균) 대비 값이라 서로 바꿔 써도 척도가 같다.
 * 이 반환값을 IMPACT_THRESHOLD(-20%)와 직접 비교하므로 기준이 어긋나면 발동 판정이 틀어진다.
 */
export function expectedImpactPct(
  diagnosis: Diagnosis,
  weather: { condition: WeatherCondition; isPrecipitating: boolean },
): number {
  const hit = diagnosis.byCondition.find((c) => c.condition === weather.condition);
  if (hit) return hit.deltaPct;
  return weather.isPrecipitating ? diagnosis.rainImpactPct : 0;
}
