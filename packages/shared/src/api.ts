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
  /** 매출×날씨 진단 (조회 시 재계산). 대시보드 진단·매출 타일의 실데이터 소스. */
  diagnosis: Diagnosis;
  proposal: Proposal;
  /**
   * 오늘 제안을 못 만들어 **지난 캠페인을 대신 보여주는 중**이면 true (실패 대본 5-3).
   *
   * 날씨·DB 장애로 오늘 생성이 실패해도 화면이 비지 않게 하는 폴백이다.
   * `date`가 오늘이 아니므로 화면은 반드시 "지난 제안"임을 표시해야 한다 — 오늘 것인 척 금지.
   */
  stale?: boolean;
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

/** PATCH /campaigns/:id — 승인/수정/반려 (상태·문구·채널·할인율 갱신). */
export interface CampaignPatchRequest {
  status?: CampaignStatus;
  editedCopy?: string;
  channels?: string[];
  /** 사장님이 편집한 쿠폰 프로모션(할인율). 서버가 proposal.promo에 병합 저장한다. */
  editedPromo?: { type: string; value: string };
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
  /** instagram 채널 게시 결과. 채널에 instagram이 없으면 undefined. */
  sns?: SnsPublishResult;
}

/** SNS(인스타그램) 게시 시도 결과. 실게시 성공/실패와 무관하게 caption을 담아 FE 복사 폴백에 쓴다. */
export interface SnsPublishResult {
  /** true = 본인 계정에 실제 게시됨(permalink 有), false = 미게시(토큰없음·오류·이미지없음) → 복사 폴백. */
  posted: boolean;
  /** 게시 성공 시 게시물 permalink. */
  permalink?: string;
  /** 게시하려던(또는 복사할) 캡션. buildSnsCaption 결과. */
  caption: string;
  /** 미게시 사유(로그·안내용). */
  error?: string;
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
