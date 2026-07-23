import type {
  NormalizedWeather,
  EnsembleWeather,
  WeatherCondition,
  WeatherSource,
} from "shared";
import { getKmaWeather, getOwmWeather } from "./weather";

/**
 * 날씨 앙상블 병합.
 *
 * - 기온·습도는 소스별 가중 평균.
 * - 강수확률·강수량은 보수적으로 max 채택(매출 방어 목적: 비 올 가능성을 높게 잡음).
 *   강수확률은 소스가 제공하지 않으면(null) 결측으로 보고 평균/비교에서 제외한다.
 * - 강수 여부는 보수적 채택: 한 소스라도 강수면 강수로 본다.
 * - 하늘상태가 갈리면 더 궂은 쪽(흐림 > 구름많음 > 맑음)을 채택한다.
 *
 * 입력은 배열이라 소스가 1개여도 동작한다(한쪽 장애 폴백 대비).
 */

/**
 * 소스별 기본 가중치. 기상청은 한반도 국지 예보 정확도가 높아 우선한다.
 * 실측 오차 데이터가 쌓이면 이 값만 튜닝하면 된다.
 */
export const SOURCE_WEIGHTS: Record<WeatherSource, number> = {
  kma: 0.6,
  owm: 0.4,
};

/** 비강수 하늘상태의 궂은 정도 (클수록 궂음). */
const SKY_SEVERITY: Record<string, number> = {
  clear: 0,
  cloudy: 1,
  overcast: 2,
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function mergeWeather(sources: NormalizedWeather[]): EnsembleWeather {
  if (sources.length === 0) {
    throw new Error("앙상블 병합할 소스가 없습니다");
  }

  const weights = sources.map((s) => SOURCE_WEIGHTS[s.source]);
  const total = weights.reduce((a, b) => a + b, 0);
  const wavg = (pick: (s: NormalizedWeather) => number): number =>
    sources.reduce((sum, s, i) => sum + pick(s) * weights[i], 0) / total;

  // 강수확률: 소스가 제공하는(non-null) 값만 모아 보수적으로 max.
  // 전부 결측이면 null("정보 없음") — 0으로 표기하지 않는다(강수 판단은 isPrecipitating/condition으로).
  const probs = sources
    .map((s) => s.precipitationProb)
    .filter((p): p is number => p !== null);
  const precipitationProb = probs.length > 0 ? Math.max(...probs) : null;

  return {
    tempC: round1(wavg((s) => s.tempC)),
    humidity: Math.round(wavg((s) => s.humidity)),
    precipitationMm: round1(Math.max(...sources.map((s) => s.precipitationMm))),
    precipitationProb,
    isPrecipitating: sources.some((s) => s.isPrecipitating),
    condition: mergeCondition(sources),
    sources: sources.map((s) => s.source),
    sourceCount: sources.length,
  };
}

/**
 * 상태 병합.
 * - 강수 소스가 하나라도 있으면: 가중치가 가장 큰 강수 소스의 상태를 채택.
 * - 모두 비강수면: 가장 궂은 하늘상태를 채택.
 */
function mergeCondition(sources: NormalizedWeather[]): WeatherCondition {
  const precip = sources.filter((s) => s.isPrecipitating);
  if (precip.length > 0) {
    return precip.reduce((best, s) =>
      SOURCE_WEIGHTS[s.source] > SOURCE_WEIGHTS[best.source] ? s : best,
    ).condition;
  }
  return sources.reduce((worst, s) =>
    (SKY_SEVERITY[s.condition] ?? 0) > (SKY_SEVERITY[worst.condition] ?? 0) ? s : worst,
  ).condition;
}

// ---- 수집 + 폴백 오케스트레이션 (1-5) ---------------------------------------

export interface EnsembleDeps {
  getKma?: (nx: number, ny: number) => Promise<NormalizedWeather>;
  getOwm?: (lat: number, lng: number) => Promise<NormalizedWeather>;
}

export interface StoreLocation {
  nx: number;
  ny: number;
  lat: number;
  lng: number;
}

/**
 * 매장 위치의 앙상블 날씨를 수집·병합한다.
 * 두 소스를 병렬 호출하고, 한쪽이 실패해도 남은 소스로 진행한다(sourceCount로 표기).
 * @throws 모든 소스가 실패한 경우
 */
export async function getEnsembleWeather(
  loc: StoreLocation,
  deps: EnsembleDeps = {},
): Promise<EnsembleWeather> {
  const getKma = deps.getKma ?? getKmaWeather;
  const getOwm = deps.getOwm ?? getOwmWeather;

  const results = await Promise.allSettled([
    getKma(loc.nx, loc.ny),
    getOwm(loc.lat, loc.lng),
  ]);

  // 부분 실패는 진행하되 로그는 남긴다 — 소스 축소(sourceCount 감소)의 원인 추적용
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const src = i === 0 ? "kma" : "owm";
      console.warn(
        `[weather] ${src} 실패:`,
        r.reason instanceof Error ? r.reason.message : r.reason,
      );
    }
  });

  const ok = results
    .filter((r): r is PromiseFulfilledResult<NormalizedWeather> => r.status === "fulfilled")
    .map((r) => r.value);

  if (ok.length === 0) {
    const reasons = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
      .join("; ");
    throw new Error(`모든 날씨 소스 실패: ${reasons}`);
  }

  return mergeWeather(ok);
}
