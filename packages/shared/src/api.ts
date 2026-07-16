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

// ---- Phase 3: 캠페인 상태 변경 · 발송 · 추적 ---------------------------------

/** PATCH /campaigns/:id — 승인/수정/반려 (상태·문구·채널 갱신). */
export interface CampaignPatchRequest {
  status?: CampaignStatus;
  editedCopy?: string;
  channels?: string[];
}
export interface CampaignPatchResponse {
  campaignId: string;
  status: CampaignStatus;
}

/** POST /campaigns/:id/send — 서버 법적 필터 통과 후 발송 (야간이면 예약 전환). */
export interface SendCampaignRequest {
  channels: string[];
  /** 데모용: 지금을 야간이라고 가정(예약 전환 시연). 서버는 실제 시각을 우선할 수 있음. */
  assumeNight?: boolean;
}
export interface SendCampaignResponse {
  /** sent = 즉시 발송 / scheduled = 야간이라 예약 전환. */
  status: "sent" | "scheduled";
  /** 광고(단골) 발송 대상 수 (동의·미거부만). SNS 전용이면 0. */
  recipients: number;
  /** 발급된 쿠폰 코드 (광고 발송 시). SNS 전용이면 null. */
  couponCode: string | null;
}

/** GET /campaigns/:id/tracking — 쿠폰 사용·귀속 매출. */
export interface TrackingResponse {
  /** 쿠폰 사용 인원. */
  used: number;
  /** 발송(대상) 인원. */
  target: number;
  /** 귀속 매출(원). */
  revenue: number;
}
