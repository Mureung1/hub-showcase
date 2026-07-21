import type {
  EnsembleWeather,
  WeatherCondition,
  WeatherSource,
  Proposal,
  Diagnosis,
  ChannelId,
  Scenario,
  ScenarioKey,
} from "shared";
import { SCENARIOS } from "../mocks/scenarios";

/**
 * 서버 응답(날씨 + 제안 + 진단)을 대시보드 표시용 Scenario로 변환하는 어댑터.
 *
 * 날씨·제안·진단·매출 타일·소스 배지를 모두 실데이터로 채운다.
 * 단, 7일 매출 스파크라인(bars)만 실 일별매출이 아직 FE에 없어 같은 날씨 유형의 mock을
 * 시각 플레이스홀더로 얹는다. (후속: GET /sales/recent 생기면 bars도 실데이터로 대체)
 */

const COND_META: Record<WeatherCondition, { emoji: string; label: string }> = {
  clear: { emoji: "☀️", label: "맑음" },
  cloudy: { emoji: "⛅", label: "구름많음" },
  overcast: { emoji: "☁️", label: "흐림" },
  rain: { emoji: "🌧️", label: "비" },
  shower: { emoji: "🌦️", label: "소나기" },
  snow: { emoji: "❄️", label: "눈" },
  sleet: { emoji: "🌨️", label: "진눈깨비" },
};

/** 날씨 소스 코드 → 한국어 표기. */
const SOURCE_LABEL: Record<WeatherSource, string> = {
  kma: "기상청",
  owm: "OpenWeather",
};

const VALID_CHANNELS: ChannelId[] = ["instagram", "x", "dangol"];

// 방어 목표: 프로모션으로 하락을 −7%까지 방어한다고 가정한 기준선.
const DEFENSE_FLOOR = -0.07;

/** 실날씨 → 매출 스파크라인(bars) 플레이스홀더에 쓸 mock 시나리오 키. */
function baseKeyFor(w: EnsembleWeather): ScenarioKey {
  if (w.condition === "snow" || w.condition === "sleet") return "cold";
  if (w.isPrecipitating) return "rain";
  if (w.tempC >= 33) return "heat";
  if (w.tempC <= 0) return "cold";
  return "sunny";
}

function toChannelIds(channels: string[]): ChannelId[] {
  const ids = channels.filter((c): c is ChannelId =>
    (VALID_CHANNELS as string[]).includes(c),
  );
  return ids.length > 0 ? ids : ["dangol"];
}

function condText(w: EnsembleWeather): string {
  const parts = [COND_META[w.condition].label, `습도 ${Math.round(w.humidity)}%`];
  if (w.isPrecipitating) parts.push(`강수 ${Math.round(w.precipitationMm)}mm/h`);
  return parts.join(" · ");
}

/** 소스 배지 문구: "기상청·OpenWeather 2개 소스 평균". */
function sourceLabelFor(w: EnsembleWeather): string {
  const names = w.sources.map((s) => SOURCE_LABEL[s] ?? s);
  if (names.length === 0) return "단일 소스";
  const count = w.sourceCount || names.length;
  return `${names.join("·")} ${count}개 소스 평균`;
}

/**
 * 오늘 날씨에 대한 예상 매출 편차(%).
 * 서버 `expectedImpactPct`(agent/diagnose.ts)와 동일 로직 — 서버 코드라 import 못 해 재구현.
 */
function todayImpactPct(diagnosis: Diagnosis, w: EnsembleWeather): number {
  const hit = diagnosis.byCondition.find((c) => c.condition === w.condition);
  if (hit) return hit.deltaPct;
  return w.isPrecipitating ? diagnosis.rainImpactPct : 0;
}

/** 편차를 부호 있는 % 문구로 (예: +12% / −18%). */
function signedPct(delta: number): string {
  return `${delta >= 0 ? "+" : "−"}${Math.abs(Math.round(delta * 100))}%`;
}

export function scenarioFromApi(
  weather: EnsembleWeather,
  proposal: Proposal,
  diagnosis: Diagnosis,
): Scenario {
  const base = SCENARIOS[baseKeyFor(weather)];
  const meta = COND_META[weather.condition];

  const delta = todayImpactPct(diagnosis, weather);
  const flat = Math.round(delta * 100) === 0;
  const down = delta < 0;
  const baseline = diagnosis.baselineRevenue;
  const predSales = Math.round(baseline * (1 + delta));
  const target = Math.round(baseline * (1 + Math.max(delta, DEFENSE_FLOOR)));
  const tone: Scenario["diagTone"] = down ? "down" : "up";

  const diagText = flat ? `${meta.label} · 평균과 비슷` : `${meta.label} 평균 ${signedPct(delta)}`;
  const impHead = flat
    ? "이 가게 데이터 기준 평균 수준"
    : `이 가게 데이터 기준 ${signedPct(delta)} ${down ? "예상" : "기대"}`;
  const impDetail = diagnosis.estimated
    ? `아직 매출 데이터가 적어 업종 평균으로 추정했어요. ${meta.label}인 날은 보통 ${signedPct(delta)} 수준입니다. 데이터가 쌓이면 더 정확해집니다.`
    : `최근 ${diagnosis.sampleDays}일 매출에서 ${meta.label}인 날이 평균 대비 ${signedPct(delta)}였어요. 방어 마케팅으로 하락을 줄일 수 있습니다.`;

  return {
    ...base,
    label: meta.label,
    emoji: meta.emoji,
    temp: `${Math.round(weather.tempC)}°C`,
    cond: condText(weather),
    sourceLabel: sourceLabelFor(weather),
    diagText,
    diagTone: tone,
    todayDown: down,
    normalSales: Math.round(baseline),
    predSales,
    target,
    impTone: tone,
    impHead,
    impDetail,
    title: proposal.title,
    copy: proposal.copy,
    promo: proposal.promo.value || proposal.promo.type,
    channels: toChannelIds(proposal.channels),
  };
}
