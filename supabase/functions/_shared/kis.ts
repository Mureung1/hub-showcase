// KIS Open API 클라이언트 (Deno/TS)
// 원본 Python(KIS_openapi/kis_alert_bot)을 docs/research.md §1~§5, §11 기준으로 포팅.
// - 토큰: /oauth2/tokenP → DB kis_token_cache(id=1) 1행 캐시 (research §1)
// - 시세 4종: 국내/해외 현재가·일봉 (research §2/§3)
// - 스로틀/재시도 (research §4/§2.5), SMA 크로스 판정 (research §5), 장운영시간 (research §11)
//
// 주의: 캐시 read/write용 supabase 클라이언트는 _shared/db.ts 의 getServiceClient() 를
//       내부에서 지연 생성한다(공개 함수 시그니처에 client 를 노출하지 않기 위함).

import { getServiceClient } from "./db.ts";

// =========================================================
// 타입
// =========================================================
export type Market = "KR" | "US";
export type Operator = ">=" | "<=" | ">" | "<";

export interface QuoteParams {
  ticker: string;
  market: Market;
  exchange?: string | null; // US 필수 (NASD/NYSE/AMEX 등)
}

export interface Candle {
  date: string; // "YYYY-MM-DD" (research §10: lightweight-charts BusinessDay 문자열)
  open: number;
  high: number;
  low: number;
  close: number;
}

// =========================================================
// env / 상수
// =========================================================
const DEFAULT_BASE_URL = "https://openapi.koreainvestment.com:9443";
const DEFAULT_TOKEN_TTL_SEC = 23 * 60 * 60; // 23h (research §1)
const TOKEN_SAFETY_MARGIN_SEC = 600; // 만료 10분 전 무효화 (research §1)
const DAILY_RANGE_DAYS = 760; // 국내 일봉 요청 범위 (research §2.3)

// 거래소 코드 매핑 (research §3, 원본 EXCHANGE_ALIASES)
const EXCHANGE_ALIASES: Record<string, string> = {
  NASD: "NAS",
  NASDAQ: "NAS",
  NAS: "NAS",
  NYSE: "NYS",
  NYS: "NYS",
  AMEX: "AMS",
  AMS: "AMS",
};

function baseUrl(): string {
  return Deno.env.get("KIS_BASE_URL") ?? DEFAULT_BASE_URL;
}
function appKey(): string {
  const v = Deno.env.get("KIS_APP_KEY");
  if (!v) throw new Error("환경변수 KIS_APP_KEY 가 없습니다");
  return v;
}
function appSecret(): string {
  const v = Deno.env.get("KIS_APP_SECRET");
  if (!v) throw new Error("환경변수 KIS_APP_SECRET 가 없습니다");
  return v;
}

// =========================================================
// 유틸
// =========================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "73,500" → 73500 (research §2: 숫자 필드는 콤마 포함 문자열)
function parseNum(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(/,/g, ""));
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 지정 타임존 기준 YYYYMMDD (research §11: Intl.DateTimeFormat 사용)
function ymdInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

// "YYYYMMDD" → "YYYY-MM-DD"
function fmtDate(ymd: unknown): string {
  const s = String(ymd ?? "");
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function normalizeExcd(exchange?: string | null): string {
  const key = String(exchange ?? "").trim().toUpperCase();
  return EXCHANGE_ALIASES[key] ?? key;
}

// 지연 생성 supabase 클라이언트 (토큰 캐시 전용)
let _client: ReturnType<typeof getServiceClient> | null = null;
function db() {
  return (_client ??= getServiceClient());
}

// =========================================================
// OAuth 토큰 (research §1)
// =========================================================
interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms (안전마진 반영 후)
  appKeyHash: string;
}

let memToken: CachedToken | null = null;

function invalidateToken(): void {
  memToken = null;
}

async function issueToken(appKeyHash: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey(),
      appsecret: appSecret(),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`KIS 토큰 발급 실패 HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const accessToken: string | undefined = data.access_token;
  if (!accessToken) {
    throw new Error(`KIS 토큰 응답에 access_token 없음: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // TTL: expires_in(초)이 있으면 (expires_in - 600)초, 없으면 23시간 (research §1)
  const ttlSec = typeof data.expires_in === "number"
    ? data.expires_in - TOKEN_SAFETY_MARGIN_SEC
    : DEFAULT_TOKEN_TTL_SEC;
  const expiresAt = Date.now() + ttlSec * 1000;

  // DB 캐시 upsert (id=1 단일 행)
  const { error } = await db().from("kis_token_cache").upsert({
    id: 1,
    access_token: accessToken,
    expires_at: new Date(expiresAt).toISOString(),
    app_key_hash: appKeyHash,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // 캐시 저장 실패해도 토큰 자체는 사용 가능 → 경고만
    console.warn(`kis_token_cache upsert 실패: ${error.message}`);
  }

  memToken = { accessToken, expiresAt, appKeyHash };
  return accessToken;
}

async function getAccessToken(): Promise<string> {
  const appKeyHash = await sha256Hex(appKey());

  // 1) 메모리 캐시
  if (memToken && memToken.appKeyHash === appKeyHash && memToken.expiresAt > Date.now()) {
    return memToken.accessToken;
  }

  // 2) DB 캐시 (app_key_hash 일치 + 만료 전이면 재사용)
  const { data } = await db()
    .from("kis_token_cache")
    .select("access_token, expires_at, app_key_hash")
    .eq("id", 1)
    .maybeSingle();

  if (data && data.app_key_hash === appKeyHash) {
    const expiresAt = new Date(data.expires_at).getTime();
    if (expiresAt > Date.now()) {
      memToken = { accessToken: data.access_token, expiresAt, appKeyHash };
      return data.access_token;
    }
  }

  // 3) 재발급
  return await issueToken(appKeyHash);
}

// =========================================================
// 스로틀 (research §4): 국내 0.2s / 해외 1.0s 최소 간격
// =========================================================
let lastCallKR = 0;
let lastCallUS = 0;

async function throttle(market: Market): Promise<void> {
  const minGap = market === "US" ? 1000 : 200;
  const last = market === "US" ? lastCallUS : lastCallKR;
  const wait = last + minGap - Date.now();
  if (wait > 0) await sleep(wait);
  const now = Date.now();
  if (market === "US") lastCallUS = now;
  else lastCallKR = now;
}

// =========================================================
// 데이터 API 공통 GET (research §1 헤더, §2.5 재시도)
// =========================================================
function looksLikeAuthError(msg: string): boolean {
  return /token|토큰|인증|만료/i.test(msg);
}

async function kisDataGet(
  path: string,
  trId: string,
  query: Record<string, string>,
  market: Market,
): Promise<Record<string, unknown>> {
  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  let authRetried = false; // 401/403 재발급은 1회만
  let attempt = 0; // 429/5xx/네트워크 재시도 (최대 2회)

  while (true) {
    await throttle(market);
    const token = await getAccessToken();

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          appkey: appKey(),
          appsecret: appSecret(),
          tr_id: trId,
          custtype: "P",
        },
      });
    } catch (e) {
      // 네트워크 오류 → 선형 백오프 재시도 (0.5s, 1.0s)
      if (attempt < 2) {
        attempt++;
        await sleep(500 * attempt);
        continue;
      }
      throw e;
    }

    // 401/403 → 토큰 무효화 후 1회만 재발급·재시도 (research §1)
    if ((res.status === 401 || res.status === 403) && !authRetried) {
      authRetried = true;
      invalidateToken();
      await issueToken(await sha256Hex(appKey()));
      continue;
    }

    // 429 / 5xx → 최대 2회 재시도
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      attempt++;
      await sleep(500 * attempt);
      continue;
    }

    if (!res.ok) {
      throw new Error(`KIS HTTP ${res.status} (tr_id=${trId})`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const rtCd = data.rt_cd;
    if (rtCd !== undefined && rtCd !== "0") {
      const msg = `${data.msg_cd ?? ""} ${data.msg1 ?? ""}`.trim();
      // 본문이 인증 오류를 시사하면 1회만 재발급·재시도 (research §1)
      if (!authRetried && looksLikeAuthError(msg)) {
        authRetried = true;
        invalidateToken();
        await issueToken(await sha256Hex(appKey()));
        continue;
      }
      throw new Error(`KIS 오류 rt_cd=${rtCd} ${msg} (tr_id=${trId})`);
    }

    return data;
  }
}

// =========================================================
// 현재가 (research §2.1 / §2.2)
// =========================================================
export async function getCurrentPrice(params: QuoteParams): Promise<number> {
  const { ticker, market, exchange } = params;
  let price: number;

  if (market === "KR") {
    const data = await kisDataGet(
      "/uapi/domestic-stock/v1/quotations/inquire-price",
      "FHKST01010100",
      { FID_COND_MRKT_DIV_CODE: "J", FID_INPUT_ISCD: ticker },
      "KR",
    );
    const output = data.output as Record<string, unknown> | undefined;
    price = parseNum(output?.stck_prpr);
  } else {
    const data = await kisDataGet(
      "/uapi/overseas-price/v1/quotations/price",
      "HHDFS00000300",
      { AUTH: "", EXCD: normalizeExcd(exchange), SYMB: ticker },
      "US",
    );
    const output = data.output as Record<string, unknown> | undefined;
    price = parseNum(output?.last);
  }

  if (!Number.isFinite(price)) {
    throw new Error(`현재가 파싱 실패 (${market} ${ticker})`);
  }
  return price;
}

// =========================================================
// 캔들 인터벌 (일/주/월/년) — KIS 1콜 최대 100봉
// =========================================================
export type Interval = "D" | "W" | "M" | "Y";

// 100봉을 채우기 위한 조회 시작일 역산(일수). KR inquire-daily-itemchartprice 용.
const INTERVAL_DAYS_BACK: Record<Interval, number> = {
  D: 200, // ~100 거래일
  W: 900, // ~100주 이상
  M: 3300, // ~100개월(8년+)
  Y: 40000, // ~100년
};
// US dailyprice GUBN: 0=일 1=주 2=월 (년봉 미지원 → 월봉으로 폴백)
const US_GUBN: Record<Interval, string> = { D: "0", W: "1", M: "2", Y: "2" };

// =========================================================
// 일봉 캔들 (research §2.3 / §2.4) — 오래된→최신 정렬, 종가 0 이하 제외
// getDailyCloses / getDailyCandles 공통 소스
// =========================================================
async function fetchDailyCandles(params: QuoteParams, interval: Interval = "D"): Promise<Candle[]> {
  const { ticker, market, exchange } = params;
  let rows: Candle[];

  if (market === "KR") {
    const daysBack = INTERVAL_DAYS_BACK[interval] ?? DAILY_RANGE_DAYS;
    const start = ymdInTz(new Date(Date.now() - daysBack * 86400000), "Asia/Seoul");
    const end = ymdInTz(new Date(), "Asia/Seoul");
    const data = await kisDataGet(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      "FHKST03010100",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: ticker,
        FID_INPUT_DATE_1: start,
        FID_INPUT_DATE_2: end,
        FID_PERIOD_DIV_CODE: interval,
        FID_ORG_ADJ_PRC: "0",
      },
      "KR",
    );
    const arr = (data.output2 ?? data.output ?? []) as Array<Record<string, unknown>>;
    rows = arr.map((r) => ({
      date: fmtDate(r.stck_bsop_date),
      open: parseNum(r.stck_oprc),
      high: parseNum(r.stck_hgpr),
      low: parseNum(r.stck_lwpr),
      close: parseNum(r.stck_clpr),
    }));
  } else {
    const bymd = ymdInTz(new Date(), "America/New_York");
    const data = await kisDataGet(
      "/uapi/overseas-price/v1/quotations/dailyprice",
      "HHDFS76240000",
      { AUTH: "", EXCD: normalizeExcd(exchange), SYMB: ticker, GUBN: US_GUBN[interval] ?? "0", BYMD: bymd, MODP: "1" },
      "US",
    );
    const arr = (data.output2 ?? []) as Array<Record<string, unknown>>;
    rows = arr.map((r) => ({
      date: fmtDate(r.xymd),
      open: parseNum(r.open),
      high: parseNum(r.high),
      low: parseNum(r.low),
      close: parseNum(r.clos),
    }));
  }

  // 응답은 최신순(내림차순) → reverse 로 오래된→최신, 종가 양수만 (research §2.3/§2.4)
  return rows.filter((c) => c.close > 0).reverse();
}

export async function getDailyCloses(params: QuoteParams): Promise<number[]> {
  const candles = await fetchDailyCandles(params);
  return candles.map((c) => c.close);
}

export async function getDailyCandles(params: QuoteParams, interval: Interval = "D"): Promise<Candle[]> {
  return await fetchDailyCandles(params, interval);
}

// =========================================================
// 평가 유틸 (research §5)
// =========================================================
export function evaluatePrice(current: number, operator: Operator, target: number): boolean {
  switch (operator) {
    case ">=":
      return current >= target;
    case "<=":
      return current <= target;
    case ">":
      return current > target;
    case "<":
      return current < target;
    default:
      return false;
  }
}

function sma(closes: number[], window: number): number {
  const slice = closes.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

// SMA 크로스 판정 (research §5 의사코드 그대로)
export function evaluateSmaCross(
  closes: number[],
  window: number,
  operator: Operator,
  currentPrice: number,
): boolean {
  if (closes.length < window) {
    throw new Error(`SMA(${window}) 계산에 필요한 종가 부족 (보유 ${closes.length})`);
  }

  const todaySma = sma(closes, window);

  // 전일 SMA 계산 불가(신규상장 등) → 단순 비교 폴백
  if (closes.length < window + 1) {
    return evaluatePrice(currentPrice, operator, todaySma);
  }

  const prevCloses = closes.slice(0, -1); // 당일 종가 제외
  const prevSma = sma(prevCloses, window);
  const prevClose = closes[closes.length - 1]; // 최신 확정 종가 = "전일 종가"

  if (operator === ">=") {
    // 상향 돌파: 어제는 SMA 아래, 오늘 현재가는 SMA 이상
    return prevClose < prevSma && currentPrice >= todaySma;
  }
  if (operator === "<=") {
    // 하향 이탈: 어제는 SMA 위, 오늘 현재가는 SMA 이하
    return prevClose > prevSma && currentPrice <= todaySma;
  }
  // >, < 는 원본 미지원 — 단순 비교 폴백 (research §5 주석)
  return evaluatePrice(currentPrice, operator, todaySma);
}

// =========================================================
// 장운영시간 필터 (research §11)
// =========================================================
export function isMarketOpen(market: Market, now: Date = new Date()): boolean {
  const timeZone = market === "US" ? "America/New_York" : "Asia/Seoul";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday"); // Mon..Sun
  let hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  if (hour === 24) hour = 0; // hour12:false 가 자정을 "24"로 줄 수 있음

  // 주말 제외
  if (weekday === "Sat" || weekday === "Sun") return false;

  const mins = hour * 60 + minute;
  if (market === "US") {
    // 04:00–20:00 America/New_York (DST 자동 반영)
    return mins >= 4 * 60 && mins <= 20 * 60;
  }
  // 09:00–15:30 Asia/Seoul
  return mins >= 9 * 60 && mins <= 15 * 60 + 30;
}
