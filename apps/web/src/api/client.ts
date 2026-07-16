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
const TIMEOUT_MS = 5000;

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

function mockCouponCode(): string {
  return "WP" + Math.random().toString(36).slice(2, 8).toUpperCase();
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

/** POST /campaigns/:id/send — 발송(야간이면 예약). */
export function sendCampaign(
  id: string,
  req: SendCampaignRequest,
): Promise<SendCampaignResponse> {
  if (MOCK_MODE) {
    const hasDangol = req.channels.includes("dangol");
    const scheduled = hasDangol && req.assumeNight === true;
    return Promise.resolve({
      status: scheduled ? "scheduled" : "sent",
      recipients: hasDangol ? DANGOL_CONSENT : 0,
      couponCode: hasDangol ? mockCouponCode() : null,
    });
  }
  return apiSend<SendCampaignResponse>("POST", `/campaigns/${id}/send`, req);
}

/** GET /campaigns/:id/tracking — 쿠폰 사용·귀속 매출. */
export function getTracking(id: string): Promise<TrackingResponse> {
  if (MOCK_MODE) return Promise.resolve(mockTracking(id));
  return apiGet<TrackingResponse>(`/campaigns/${id}/tracking`);
}
