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
 */
export function pickBaseDateTime(now: Date): { baseDate: string; baseTime: string } {
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const available = BASE_HOURS.filter((h) => h * 60 + PROVIDE_DELAY_MIN <= hhmm);

  let target = now;
  let hour: number;
  if (available.length === 0) {
    target = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 전날
    hour = BASE_HOURS[BASE_HOURS.length - 1]; // 23시
  } else {
    hour = available[available.length - 1];
  }

  const baseDate = `${target.getFullYear()}${pad2(target.getMonth() + 1)}${pad2(target.getDate())}`;
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
 * 기상청 응답 JSON을 오늘 대표 예보 한 건으로 정규화한다.
 * 대표 슬롯 = 오늘 날짜(base_date)의 가장 이른 fcstTime.
 */
export function parseKmaResponse(json: unknown): NormalizedWeather {
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

  // 첫 예보 날짜의 가장 이른 시각을 대표 슬롯으로 선택
  const baseDate = items[0].fcstDate;
  const slotTimes = items
    .filter((it) => it.fcstDate === baseDate)
    .map((it) => it.fcstTime)
    .sort();
  const slotTime = slotTimes[0];

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
    timeoutMs: deps.timeoutMs ?? 3000,
    retries: deps.retries ?? 1,
  });

  return parseKmaResponse(await res.json());
}
