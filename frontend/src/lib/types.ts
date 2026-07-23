export type CredentialType = "career" | "certificate" | "portfolio" | "company";

export interface Credential {
  id: string;
  type: CredentialType;
  title: string;
  detail: string;
  status?: string;
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

  /** 적합도 점수 0~100 = Σ(가중치 × 충족도) × 100 */
  fitScore: number;
  collectedAt: string;
  tags?: string[];
  sourceUrl?: string;
}

export interface PositionDetail extends Position {
  requirements: Requirement[];
  /** "내 이력으로 맞추는 방향" */
  advice: string[];
}

export type DocType = "resume" | "letter";
