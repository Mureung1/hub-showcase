import type { EnsembleWeather } from "./weather";
import type { Diagnosis } from "./diagnosis";
import type { Proposal } from "./proposal";

/**
 * FE·BE가 주고받는 HTTP 응답 계약(DTO).
 * 서버 라우트가 반환하는 JSON 형태의 단일 출처 — FE는 이 타입으로 파싱하고,
 * BE는 이 타입에 맞춰 응답한다. (양쪽에 중복 정의 금지)
 */

/** 캠페인 상태 (campaigns.status). */
export type CampaignStatus = "draft" | "approved" | "sent" | "scheduled";

/** 매장 최소 참조. */
export interface StoreRef {
  id: string;
  name: string;
}

/** GET /weather/today */
export interface WeatherTodayResponse {
  store: StoreRef;
  weather: EnsembleWeather;
}

/** GET /proposal/today — 오늘 제안이 있을 때. */
export interface ProposalTodayFound {
  campaignId: string;
  date: string;
  status: CampaignStatus;
  weather: EnsembleWeather;
  proposal: Proposal;
}

/** GET /proposal/today — 아직 생성 전일 때. */
export interface ProposalTodayEmpty {
  proposal: null;
  message: string;
}

export type ProposalTodayResponse = ProposalTodayFound | ProposalTodayEmpty;

/** POST /proposal/generate */
export interface ProposalGenerateResponse {
  store: StoreRef;
  weather: EnsembleWeather;
  diagnosis: Diagnosis;
  proposal: Proposal;
  campaignId: string;
  status: CampaignStatus;
}
