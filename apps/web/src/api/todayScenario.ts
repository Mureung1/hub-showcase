import type {
  EnsembleWeather,
  WeatherCondition,
  Proposal,
  ChannelId,
  Scenario,
  ScenarioKey,
} from "shared";
import { SCENARIOS } from "../mocks/scenarios";

/**
 * 서버 응답(날씨 + 제안)을 대시보드 표시용 Scenario로 변환하는 어댑터.
 *
 * 날씨 카드·제안 문구는 실데이터이지만, POS 매출 스파크라인·진단 수치는 아직
 * 같은 날씨 유형의 mock을 베이스로 얹은 플레이스홀더다.
 * (매출·진단 실연동은 D3+ 백엔드 엔드포인트로 대체 예정 — 그때 이 어댑터를 걷어낸다)
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

const VALID_CHANNELS: ChannelId[] = ["instagram", "x", "dangol"];

/** 실날씨 → 매출·진단 플레이스홀더에 쓸 mock 시나리오 키. */
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

export function scenarioFromApi(weather: EnsembleWeather, proposal: Proposal): Scenario {
  const base = SCENARIOS[baseKeyFor(weather)];
  const meta = COND_META[weather.condition];
  return {
    ...base,
    emoji: meta.emoji,
    temp: `${Math.round(weather.tempC)}°C`,
    cond: condText(weather),
    title: proposal.title,
    copy: proposal.copy,
    promo: proposal.promo.value || proposal.promo.type,
    channels: toChannelIds(proposal.channels),
  };
}
