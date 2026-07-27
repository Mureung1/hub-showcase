import type {
  WeatherTodayResponse,
  ProposalTodayResponse,
  CampaignPatchRequest,
  CampaignPatchResponse,
  SendCampaignRequest,
  SendCampaignResponse,
  TrackingResponse,
} from "shared";
import { DANGOL_CONSENT } from "../styles/tokens";

/**
 * 서버 REST API fetch 래퍼 (+ MOCK_MODE 스위치).
 *
 * MOCK_MODE = true(기본)이면 화면은 mocks/scenarios 데이터로 동작하고,
 * 이 모듈의 fetch 함수는 호출되지 않는다. VITE_MOCK_MODE="false"로 두면
 * 실서버(VITE_API_BASE)에 붙는다. 발표장 네트워크 불신 대비 데모 보험.
 */

/** "false"일 때만 실연동. 미설정/그 외 값은 mock. */
export const MOCK_MODE: boolean = import.meta.env.VITE_MOCK_MODE !== "false";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
// 기상청+OWM 앙상블이 수 초 걸릴 수 있어 넉넉히 (5s는 콜드 fetch에서 타임아웃 남).
const TIMEOUT_MS = 12000;

/** GET 요청 공통 래퍼 — 타임아웃 + 에러 메시지 파싱. */
async function apiGet<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `요청 실패 (${res.status})`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** GET /weather/today — 기본 매장의 오늘 앙상블 날씨. */
export function getWeatherToday(): Promise<WeatherTodayResponse> {
  return apiGet<WeatherTodayResponse>("/weather/today");
}

/** GET /proposal/today — 오늘 저장된 제안(없으면 proposal: null). */
export function getProposalToday(): Promise<ProposalTodayResponse> {
  return apiGet<ProposalTodayResponse>("/proposal/today");
}

/** POST/PATCH 요청 공통 래퍼 — 타임아웃 + JSON body + 에러 메시지 파싱. */
async function apiSend<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(b?.error ?? `요청 실패 (${res.status})`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---- MOCK 응답 (MOCK_MODE=on 시 서버 대신 사용) -----------------------------

// 서버(db/queries.ts newCouponCode)와 동일한 5자 형식 — 0·O·1·I·L 제외.
function mockCouponCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// 캠페인별 추적 시작 시각 — MOCK에서 쿠폰 사용을 시간에 따라 램프업시킨다.
// (실서버는 쿠폰 코드 누적 집계로 대체 — D5)
const mockTrackStart = new Map<string, number>();
const MOCK_TRACK_FINAL_USED = 37; // 최종 사용 인원(데모)
const MOCK_TRACK_RAMP_MS = 8000; // 0 → 최종까지 램프 시간

function mockTracking(id: string): TrackingResponse {
  const now = Date.now();
  if (!mockTrackStart.has(id)) mockTrackStart.set(id, now);
  const elapsed = now - (mockTrackStart.get(id) ?? now);
  const ratio = Math.min(1, elapsed / MOCK_TRACK_RAMP_MS);
  const used = Math.floor(ratio * MOCK_TRACK_FINAL_USED);
  return { used, target: DANGOL_CONSENT, revenue: used * 1300 };
}

/** PATCH /campaigns/:id — 승인/수정/반려. */
export function patchCampaign(
  id: string,
  req: CampaignPatchRequest,
): Promise<CampaignPatchResponse> {
  if (MOCK_MODE) {
    return Promise.resolve({ campaignId: id, status: req.status ?? "approved" });
  }
  return apiSend<CampaignPatchResponse>("PATCH", `/campaigns/${id}`, req);
}

/**
 * MOCK에서 "게시 완료" UI를 보여줄 때 링크할 실제 게시물 permalink.
 *
 * 빈 문자열이면 MOCK은 `posted:false`(복사 폴백)로 정직하게 강등된다.
 * 채울 값은 **실제로 게시된 게시물의 permalink만** — 없는 게시물을 가리키면
 * 데모에서 링크가 깨지고, 존재하지 않는 게시를 성공으로 꾸미는 셈이 된다.
 * (실연동 경로는 이 상수를 쓰지 않는다 — 서버가 게시 후 받은 permalink를 그대로 준다.)
 */
const DEMO_IG_PERMALINK = "https://www.instagram.com/p/DbSCTJfEjCB/";

/** POST /campaigns/:id/send — 발송(야간이면 예약). */
export function sendCampaign(
  id: string,
  req: SendCampaignRequest,
  /** MOCK 전용 캡션. 실서버는 DB의 proposal로 캡션을 직접 만들므로 이 값을 쓰지 않는다. */
  mockCaption?: string,
): Promise<SendCampaignResponse> {
  if (MOCK_MODE) {
    const hasDangol = req.channels.includes("dangol");
    const scheduled = hasDangol && req.assumeNight === true;
    const igOn = req.channels.includes("instagram");
    return Promise.resolve({
      status: scheduled ? "scheduled" : "sent",
      recipients: hasDangol ? DANGOL_CONSENT : 0,
      couponCode: hasDangol ? mockCouponCode() : null,
      // instagram 채널일 때만 sns를 채운다(서버 응답 형태와 동일).
      sns: igOn
        ? {
            posted: Boolean(DEMO_IG_PERMALINK),
            permalink: DEMO_IG_PERMALINK || undefined,
            caption: mockCaption ?? "",
            error: DEMO_IG_PERMALINK ? undefined : "MOCK_MODE — 실게시 안 함",
          }
        : undefined,
    });
  }
  return apiSend<SendCampaignResponse>("POST", `/campaigns/${id}/send`, req);
}

/** GET /campaigns/:id/tracking — 쿠폰 사용·귀속 매출. */
export function getTracking(id: string): Promise<TrackingResponse> {
  if (MOCK_MODE) return Promise.resolve(mockTracking(id));
  return apiGet<TrackingResponse>(`/campaigns/${id}/tracking`);
}
