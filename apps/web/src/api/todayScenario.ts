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
  // 데모 고정 날씨(DEMO_WEATHER)는 실 API를 안 부른다 → 소스 평균인 척하면 안 된다.
  // 진단·문구·발송은 여전히 실제로 도는 만큼, 고정된 게 '날씨 입력'뿐임을 명시한다.
  if (w.seeded) return "데모 고정 날씨 (실제 예보 API 미사용)";
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
  // 반올림상 0%(flat)는 하락으로 보지 않는다 — "평균과 비슷" 문구에 down 배지가 붙는 모순 방지.
  const down = !flat && delta < 0;
  // delta는 normalRevenue(무강수 평균) 대비 값이다 — 예상·목표 매출도 같은 기준에서 계산해야
  // 한다. 전체 평균(baselineRevenue)에 곱하면 서로 다른 기준선을 섞어 숫자가 틀어진다.
  const baseline = diagnosis.normalRevenue;
  const predSales = Math.round(baseline * (1 + delta));
  const target = Math.round(baseline * (1 + Math.max(delta, DEFENSE_FLOOR)));
  const tone: Scenario["diagTone"] = down ? "down" : "up";

  const diagText = flat ? `${meta.label} · 평균과 비슷` : `${meta.label} 평균 ${signedPct(delta)}`;
  const impHead = flat
    ? "이 가게 데이터 기준 평균 수준"
    : `이 가게 데이터 기준 ${signedPct(delta)} ${down ? "예상" : "기대"}`;
  // 뒷문장은 하락일 때만 "방어"를 말한다. 상승·평균 수준인데 "하락을 줄일 수 있습니다"를
  // 붙이면 바로 위의 "+7% 기대"와 정면으로 모순된다(맑은 날 화면에 실제로 노출됐다).
  // 상승일 때는 06:30 잡이 임계(−20%) 미달이면 알림을 스킵하는 동작(jobs/daily.ts)과
  // 같은 말을 해준다 — 화면과 에이전트 행동이 어긋나 보이지 않게.
  const impTail = down
    ? "방어 마케팅으로 하락을 줄일 수 있습니다."
    : "방어할 하락이 없는 날이라, 에이전트도 굳이 캠페인을 권하지 않습니다.";
  const impDetail = diagnosis.estimated
    ? `아직 매출 데이터가 적어 업종 평균으로 추정했어요. ${meta.label}인 날은 보통 ${signedPct(delta)} 수준입니다. 데이터가 쌓이면 더 정확해집니다.`
    // "최근 N일"이라고 하면 연속 구간처럼 읽히는데, 실제로는 캠페인을 보낸 날을 뺀 표본이라
    // 비연속이다. 그 날들을 왜 뺐는지(= 캠페인 효과가 날씨 진단에 섞이면 안 됨)까지 한 줄에
    // 넣으면 길어져서, 근거가 되는 표본이 무엇인지만 밝힌다.
    : `캠페인 없던 ${diagnosis.sampleDays}일 기준, ${meta.label}인 날은 비 안 오는 날 대비 ${signedPct(delta)}였어요. ${impTail}`;

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
