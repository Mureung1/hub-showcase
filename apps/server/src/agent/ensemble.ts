import type {
  NormalizedWeather,
  EnsembleWeather,
  WeatherCondition,
  WeatherSource,
} from "shared";
import { getKmaWeather, getOwmWeather } from "./weather";
import { resolveDemoWeather } from "./demoWeather";

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
 *
 * 2026-07-27 실측으로 0.6/0.4 → 0.7/0.3 조정. 같은 시각(18:57) 성남 정자동에서
 * 기상청 초단기실황(관측) 29.4℃ · 기상청 단기예보 29.0℃ · OWM current 27.58℃로,
 * OWM이 관측 대비 1.8℃ 낮게 읽었다. OWM은 전지구 모델 보간이라 한국 국지값과 벌어진다.
 * (앙상블 결과 28.4 → 28.6으로 관측에 근접)
 */
export const SOURCE_WEIGHTS: Record<WeatherSource, number> = {
  kma: 0.7,
  owm: 0.3,
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
  /** 데모 고정 날씨 조회 (테스트 주입용). 기본은 DEMO_WEATHER 환경변수를 읽는다. */
  demoWeather?: () => EnsembleWeather | null;
  /** 현재 시각(ms). 캐시 만료 판정용 — 테스트에서 시간을 밀어보려고 주입한다. */
  now?: () => number;
}

/**
 * 앙상블 결과 캐시 TTL.
 *
 * 기상청 단기예보는 **3시간 단위 슬롯**을 하루 8회 발표하고, OWM current는 약 10분 주기로
 * 갱신된다. 5분 동안은 어차피 같은 값이 오므로 정확도 손실 없이 왕복만 줄인다.
 *
 * 캐시가 없을 때 실측: /weather/today가 매 요청 1979~4292ms(4292는 기상청 3s 타임아웃 후
 * 재시도가 성공한 케이스). 대시보드가 이 응답을 기다리느라 그대로 로딩 시간이 됐다.
 */
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;

interface WeatherCacheEntry {
  weather: EnsembleWeather;
  expiresAt: number;
}

// 프로세스 메모리 캐시. 매장 수가 적어 무한 증가 걱정이 없고, 재시작하면 자연히 비워진다.
const weatherCache = new Map<string, WeatherCacheEntry>();

/** 캐시 키 — 기상청 격자(nx·ny)와 OWM 좌표(lat·lng)가 모두 같아야 같은 날씨다. */
function cacheKeyFor(loc: StoreLocation): string {
  return `${loc.nx},${loc.ny},${loc.lat},${loc.lng}`;
}

/** 캐시를 비운다 (테스트·수동 갱신용). */
export function clearWeatherCache(): void {
  weatherCache.clear();
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
  // 데모 고정 날씨(5-1) — 켜져 있으면 실 API를 아예 부르지 않는다.
  // 여기가 날씨의 유일한 관문이라(라우트·크론·파이프라인이 전부 경유) 한 곳만 막으면 전체에 걸린다.
  const demo = (deps.demoWeather ?? resolveDemoWeather)();
  if (demo) {
    console.warn(`[weather] 데모 고정 날씨 사용: ${demo.condition} ${demo.tempC}°C (DEMO_WEATHER)`);
    return demo;
  }

  // 캐시 히트면 즉시 반환. 데모 seed보다 뒤에 둬야 seed를 켠 직후에도 바로 반영된다.
  const now = (deps.now ?? Date.now)();
  const key = cacheKeyFor(loc);
  const hit = weatherCache.get(key);
  // 호출부가 결과를 고쳐도 캐시가 오염되지 않게 복사본을 준다.
  if (hit && hit.expiresAt > now) return { ...hit.weather };

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
    // 실패는 캐시하지 않는다 — 다음 요청이 곧바로 재시도할 수 있어야 한다.
    throw new Error(`모든 날씨 소스 실패: ${reasons}`);
  }

  const merged = mergeWeather(ok);
  // 캐시엔 복사본을 넣는다. 반환한 객체를 호출부가 고쳐도 캐시가 오염되지 않아야 한다.
  weatherCache.set(key, { weather: { ...merged }, expiresAt: now + WEATHER_CACHE_TTL_MS });
  return merged;
}
