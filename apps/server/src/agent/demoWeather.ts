import type { EnsembleWeather } from "shared";

/**
 * 데모용 고정 날씨(5-1) — `DEMO_WEATHER` 환경변수로만 켜진다. 미설정이면 평소대로 실 API를 쓴다.
 *
 * **왜 필요한가.** 발표 당일 성남 정자동이 맑으면 진단이 "+12% 기대"로 나오고,
 * "날씨로 떨어질 매출을 방어한다"는 서사 자체가 성립하지 않는다. 방어할 하락이 없기 때문이다.
 * 날씨는 통제할 수 없으므로 **입력만** 고정하고 그 뒤(진단·LLM·발송·쿠폰)는 전부 실제로 돌린다.
 *
 * **왜 이 방식인가.** 대안은 두 가지였다.
 * - `?weather=rain` 쿼리 파라미터: 호출하는 곳마다 FE 배선이 필요하고, 배포 URL에 아무나
 *   날씨를 바꾸는 손잡이가 생긴다 → 기각.
 * - MOCK_MODE로 전부 대체: 서버를 아예 안 부르므로 "실연동"을 보여줄 수 없다 → 폴백으로만 유지.
 * 환경변수는 Render 대시보드에서 켜고 끌 수 있고 재시작 시 자동 반영돼 이 둘의 단점이 없다.
 *
 * 값은 `apps/web/src/mocks/scenarios.ts`의 같은 이름 시나리오와 맞춰,
 * MOCK 리허설과 실연동 데모가 같은 그림을 보여주게 했다.
 */

/** 지원하는 고정 날씨 키. FE 데모 컨트롤(비·맑음·한파·폭염)과 1:1 대응. */
export const DEMO_WEATHER_KEYS = ["rain", "clear", "cold", "heat"] as const;
export type DemoWeatherKey = (typeof DEMO_WEATHER_KEYS)[number];

/**
 * 프리셋. sources는 빈 배열·sourceCount 0 — 실제로 아무 소스도 안 썼기 때문이다.
 * (화면 배지가 "N개 소스 평균"을 띄우지 못하게 하는 장치이기도 하다.)
 */
const PRESETS: Record<DemoWeatherKey, EnsembleWeather> = {
  // 기본 데모: 비 → 하락 예상 → 방어 캠페인. 서사가 가장 잘 붙는다.
  rain: {
    tempC: 18,
    humidity: 85,
    precipitationMm: 6,
    precipitationProb: 80,
    isPrecipitating: true,
    condition: "rain",
    sources: [],
    sourceCount: 0,
    seeded: true,
  },
  clear: {
    tempC: 24,
    humidity: 40,
    precipitationMm: 0,
    precipitationProb: 0,
    isPrecipitating: false,
    condition: "clear",
    sources: [],
    sourceCount: 0,
    seeded: true,
  },
  cold: {
    tempC: -6,
    humidity: 60,
    precipitationMm: 2,
    precipitationProb: 70,
    isPrecipitating: true,
    condition: "snow",
    sources: [],
    sourceCount: 0,
    seeded: true,
  },
  heat: {
    tempC: 35,
    humidity: 45,
    precipitationMm: 0,
    precipitationProb: 0,
    isPrecipitating: false,
    condition: "clear",
    sources: [],
    sourceCount: 0,
    seeded: true,
  },
};

function isDemoKey(v: string): v is DemoWeatherKey {
  return (DEMO_WEATHER_KEYS as readonly string[]).includes(v);
}

/**
 * `DEMO_WEATHER` 값에 해당하는 고정 날씨를 준다. 미설정·빈값·오타면 null(= 실 API 사용).
 *
 * 오타를 조용히 무시하면 발표 직전에 "왜 seed가 안 먹지"로 시간을 태우게 되므로,
 * 값이 있는데 못 알아들었을 때만 경고를 남긴다.
 *
 * @param raw 테스트에서 주입용. 생략 시 process.env.DEMO_WEATHER.
 */
export function resolveDemoWeather(raw?: string | undefined): EnsembleWeather | null {
  const value = (raw ?? process.env.DEMO_WEATHER ?? "").trim().toLowerCase();
  if (value === "") return null;
  if (!isDemoKey(value)) {
    console.warn(
      `[demo] DEMO_WEATHER="${value}"를 알 수 없어 실제 날씨를 씁니다. 가능한 값: ${DEMO_WEATHER_KEYS.join(", ")}`,
    );
    return null;
  }
  // 호출부가 실수로 고쳐 쓰지 못하게 매번 복사본을 준다(프리셋은 모듈 전역).
  return { ...PRESETS[value] };
}
