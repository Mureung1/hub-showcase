import type { WeatherTodayResponse, ProposalTodayResponse } from "shared";

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
