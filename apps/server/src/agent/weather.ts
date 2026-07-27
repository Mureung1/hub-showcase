import type { NormalizedWeather, WeatherCondition } from "shared";

/**
 * 기상청 단기예보(getVilageFcst) 클라이언트.
 *
 * - 공공데이터포털 VilageFcstInfoService_2.0 사용.
 * - 타임아웃 3초, 실패 시 재시도 1회 (DoD).
 * - HTTP·시각은 주입 가능하게 만들어 단위테스트에서 목킹한다.
 */

const KMA_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

/** 단기예보 발표 시각 (매일 8회, 시 단위). 발표 후 약 10분 뒤 제공된다. */
const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
const PROVIDE_DELAY_MIN = 10;

/**
 * 한국 표준시 오프셋(UTC+9, DST 없음).
 * 서버가 UTC(예: Render)로 돌아도 KST 벽시계로 계산하려고, 타임스탬프를 +9h 밀어 UTC 필드를 읽는다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface KmaDeps {
  serviceKey?: string;
  fetchFn?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
  retries?: number;
}

interface KmaItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * 현재 시각 기준 가장 최근 발표분(base_date, base_time)을 고른다.
 * 제공 지연(10분)을 반영해, 발표시각 + 10분이 지난 슬롯만 사용한다.
 * 자정~02:10처럼 오늘 슬롯이 없으면 전날 23시 발표분을 쓴다.
 *
 * 기상청 발표시각은 KST 기준이라, 서버가 UTC(Render)로 돌면 now.getHours()가 9시간 어긋난다.
 * → 타임스탬프를 +9h 밀고 UTC 필드를 읽어 KST 벽시계로 계산한다. (한국은 DST 없어 고정 오프셋 안전)
 */
export function pickBaseDateTime(now: Date): { baseDate: string; baseTime: string } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const hhmm = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const available = BASE_HOURS.filter((h) => h * 60 + PROVIDE_DELAY_MIN <= hhmm);

  let target = kst;
  let hour: number;
  if (available.length === 0) {
    target = new Date(kst.getTime() - 24 * 60 * 60 * 1000); // 전날(KST)
    hour = BASE_HOURS[BASE_HOURS.length - 1]; // 23시
  } else {
    hour = available[available.length - 1];
  }

  const baseDate = `${target.getUTCFullYear()}${pad2(target.getUTCMonth() + 1)}${pad2(target.getUTCDate())}`;
  const baseTime = `${pad2(hour)}00`;
  return { baseDate, baseTime };
}

/** 기상청 PTY(강수형태)·SKY(하늘상태) → 내부 상태 매핑. */
function toCondition(pty: string, sky: string): WeatherCondition {
  switch (pty) {
    case "1":
      return "rain";
    case "2":
      return "sleet";
    case "3":
      return "snow";
    case "4":
      return "shower";
    default:
      break;
  }
  // PTY 0(강수없음) → 하늘상태로 판단
  switch (sky) {
    case "1":
      return "clear";
    case "3":
      return "cloudy";
    case "4":
      return "overcast";
    default:
      return "clear";
  }
}

/** 기상청 PCP 문자열("강수없음","1.0mm","1mm 미만" 등) → 숫자 mm. */
function parsePcp(pcp: string | undefined): number {
  if (!pcp || pcp.includes("없음")) return 0;
  if (pcp.includes("미만")) return 0.5; // "1mm 미만" 근사
  const m = pcp.match(/[\d.]+/);
  return m ? Number(m[0]) : 0;
}

/**
 * "YYYYMMDD","HHMM"(KST 벽시계) → 비교용 분(minute) 값.
 * 슬롯 간 거리 비교에만 쓰므로 벽시계를 UTC로 취급해 계산해도 무방하다.
 */
function slotToMinutes(fcstDate: string, fcstTime: string): number {
  const y = Number(fcstDate.slice(0, 4));
  const mo = Number(fcstDate.slice(4, 6));
  const d = Number(fcstDate.slice(6, 8));
  const h = Number(fcstTime.slice(0, 2));
  const mi = Number(fcstTime.slice(2, 4));
  return Date.UTC(y, mo - 1, d, h, mi) / 60000;
}

/**
 * 기상청 응답 JSON을 현재 시각의 대표 예보 한 건으로 정규화한다.
 * 대표 슬롯 = 현재(KST) 시각에 가장 가까운 예보 슬롯.
 *
 * (구현 배경: 예전엔 "가장 이른 슬롯"을 골랐다. 서버가 UTC면 base_time이 새벽으로 잡혀
 *  새벽 예보 기온이 대표로 뽑혔고, OWM 실황과 앙상블 평균할 때 실제 기온과 크게 어긋났다.)
 */
export function parseKmaResponse(json: unknown, now: Date = new Date()): NormalizedWeather {
  const root = json as {
    response?: {
      header?: { resultCode?: string; resultMsg?: string };
      body?: { items?: { item?: KmaItem[] } };
    };
  };

  const code = root.response?.header?.resultCode;
  if (code !== "00") {
    throw new Error(`기상청 응답 오류: ${code} ${root.response?.header?.resultMsg ?? ""}`.trim());
  }

  const items = root.response?.body?.items?.item ?? [];
  if (items.length === 0) throw new Error("기상청 예보 항목이 비어 있습니다");

  // 현재(KST) 시각에 가장 가까운 슬롯을 대표로 선택 (여러 예보 시각·날짜 중 |slot - now| 최소).
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const nowMin =
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate(),
      kst.getUTCHours(),
      kst.getUTCMinutes(),
    ) / 60000;

  let best = items[0];
  let bestDist = Infinity;
  for (const it of items) {
    const dist = Math.abs(slotToMinutes(it.fcstDate, it.fcstTime) - nowMin);
    if (dist < bestDist) {
      bestDist = dist;
      best = it;
    }
  }
  const baseDate = best.fcstDate;
  const slotTime = best.fcstTime;

  const slot = items.filter((it) => it.fcstDate === baseDate && it.fcstTime === slotTime);
  const pick = (cat: string): string | undefined =>
    slot.find((it) => it.category === cat)?.fcstValue;

  const pty = pick("PTY") ?? "0";
  const sky = pick("SKY") ?? "1";
  const precipitationMm = parsePcp(pick("PCP"));

  const iso =
    `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6, 8)}` +
    `T${slotTime.slice(0, 2)}:${slotTime.slice(2, 4)}`;

  return {
    source: "kma",
    baseDateTime: iso,
    tempC: Number(pick("TMP") ?? 0),
    humidity: Number(pick("REH") ?? 0),
    precipitationMm,
    precipitationProb: Number(pick("POP") ?? 0),
    isPrecipitating: pty !== "0",
    condition: toCondition(pty, sky),
  };
}

/** AbortController 타임아웃 + 재시도. 마지막 시도 실패 시 에러를 던진다. */
async function fetchWithRetry(
  url: string,
  opts: { fetchFn: typeof fetch; timeoutMs: number; retries: number },
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await opts.fetchFn(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * 격자(nx, ny)의 오늘 대표 날씨를 기상청에서 가져온다.
 * @throws 서비스키 미설정, 네트워크(재시도 후) 실패, 응답 오류 시
 */
export async function getKmaWeather(
  nx: number,
  ny: number,
  deps: KmaDeps = {},
): Promise<NormalizedWeather> {
  const serviceKey = deps.serviceKey ?? process.env.KMA_SERVICE_KEY;
  if (!serviceKey) throw new Error("KMA_SERVICE_KEY 가 설정되지 않았습니다");

  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ? deps.now() : new Date();
  const { baseDate, baseTime } = pickBaseDateTime(now);

  const params = new URLSearchParams({
    serviceKey,
    pageNo: "1",
    numOfRows: "300",
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(nx),
    ny: String(ny),
  });

  const res = await fetchWithRetry(`${KMA_ENDPOINT}?${params.toString()}`, {
    fetchFn,
    // 3000ms는 여유가 없었다 — 실측 응답이 924~2816ms라 종종 천장에 부딪혀
    // 재시도가 발동했고(/weather/today 4292ms = 3000 타임아웃 + 1292 재시도), 두 번 다
    // 느리면 OWM 단독으로 떨어졌다. 앙상블 결과가 캐시되므로 올려도 체감 비용이 없다.
    timeoutMs: deps.timeoutMs ?? 5000,
    retries: deps.retries ?? 1,
  });

  return parseKmaResponse(await res.json(), now);
}

// ---- OpenWeatherMap (앙상블 2순위 · 기상청 폴백) ----------------------------

const OWM_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather";

export interface OwmDeps {
  apiKey?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
}

/** OpenWeatherMap weather[0].id → 내부 상태 매핑. */
function owmCondition(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return "shower"; // 뇌우
  if (id >= 300 && id < 500) return "rain"; // 이슬비
  if (id >= 500 && id < 600) return id >= 520 ? "shower" : "rain"; // 소나기/비
  if (id >= 600 && id < 700) {
    if (id >= 611 && id <= 616) return "sleet"; // 진눈깨비/비섞임
    return "snow";
  }
  if (id >= 700 && id < 800) return "overcast"; // 안개·연무류는 흐림으로 근사
  if (id === 800) return "clear";
  return id >= 803 ? "overcast" : "cloudy"; // 80x 구름
}

/** OWM current weather 응답을 정규화한다. */
export function parseOwmResponse(json: unknown): NormalizedWeather {
  const root = json as {
    weather?: { id: number }[];
    main?: { temp?: number; humidity?: number };
    rain?: Record<string, number>;
    snow?: Record<string, number>;
    dt?: number;
    cod?: number | string;
    message?: string;
  };

  if (root.cod !== undefined && Number(root.cod) !== 200) {
    throw new Error(`OWM 응답 오류: ${root.cod} ${root.message ?? ""}`.trim());
  }
  const id = root.weather?.[0]?.id;
  if (id === undefined) throw new Error("OWM 날씨 항목이 비어 있습니다");

  const condition = owmCondition(id);
  // current weather에는 시간당 강수량만 있고 강수확률(pop)은 없다 → 0.
  const precipitationMm = root.rain?.["1h"] ?? root.snow?.["1h"] ?? 0;
  const baseDateTime = root.dt
    ? new Date(root.dt * 1000).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  return {
    source: "owm",
    baseDateTime,
    tempC: root.main?.temp ?? 0,
    humidity: root.main?.humidity ?? 0,
    precipitationMm,
    precipitationProb: null, // current weather API는 강수확률(POP)을 제공하지 않음
    isPrecipitating: id < 700,
    condition,
  };
}

/**
 * 위경도의 현재 날씨를 OpenWeatherMap에서 가져온다.
 * @throws API 키 미설정, 네트워크(재시도 후) 실패, 응답 오류 시
 */
export async function getOwmWeather(
  lat: number,
  lng: number,
  deps: OwmDeps = {},
): Promise<NormalizedWeather> {
  const apiKey = deps.apiKey ?? process.env.OWM_API_KEY;
  if (!apiKey) throw new Error("OWM_API_KEY 가 설정되지 않았습니다");

  const fetchFn = deps.fetchFn ?? fetch;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    appid: apiKey,
    units: "metric",
  });

  const res = await fetchWithRetry(`${OWM_ENDPOINT}?${params.toString()}`, {
    fetchFn,
    timeoutMs: deps.timeoutMs ?? 3000,
    retries: deps.retries ?? 1,
  });

  return parseOwmResponse(await res.json());
}
