export type CredentialType = "career" | "certificate" | "portfolio" | "company";

/** 백엔드 CredentialDto.Response 와 1:1 대응 */
export interface Credential {
  id: number;
  type: CredentialType;
  title: string;
  detail: string;
  /** ISO date "2023-03-01" | null */
  startedOn?: string | null;
  endedOn?: string | null;
  /** 재직/보유 여부 — 백엔드가 계산해 내려준다 */
  ongoing: boolean;
}

/** 이력 저장 요청 — 백엔드 CredentialDto.SaveRequest 와 대응 */
export interface CredentialInput {
  type: CredentialType;
  title: string;
  detail: string;
  startedOn?: string | null;
  endedOn?: string | null;
}

/** GET /api/auth/me */
export interface Me {
  id: number;
  email: string;
  name: string;
  completeness: number;
}

export interface Requirement {
  /** 요구조건 텍스트 */
  name: string;
  /** 필수 여부 (false = 우대) */
  required: boolean;
  /** 추정 가중치 0~1 */
  weight: number;
  /** 내 이력의 충족도 0~1 */
  fulfillment: number;
  /** 충족도 판단 근거 */
  evidence: string;
}

export interface Position {
  id: string;
  company: string;
  title: string;
  location: string;
  experience: string;
  tags?: string[];
  /** 적합도 점수 0~100 = Σ(가중치 × 충족도) × 100 */
  fitScore: number;
  collectedAt: string;
  sourceUrl?: string;
}

export interface PositionDetail extends Position {
  /** Σ(가중치 × 충족도), 0~1. 게이트 보정 전 값 */
  fulfillmentSum: number;
  requirements: Requirement[];
  /** "내 이력으로 맞추는 방향" */
  advice: string[];
}

export type DocType = "resume" | "letter";