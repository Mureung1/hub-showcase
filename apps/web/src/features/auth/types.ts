import type { Session } from "@supabase/supabase-js";

/**
 * Auth feature 내부 타입 (SPEC-AUTH-001 6장).
 * Supabase Auth 응답은 여기서만 다루고, 서비스 도메인 계약(@decision-log/shared)에는
 * 넣지 않는다 (userId 계약 승격 여부는 SPEC-AUTH-002~003에서 재검토).
 */

/** 화면에 표시할 정도로 정규화한 인증 오류. 비밀값·토큰은 담지 않는다. */
export interface AuthErrorInfo {
  /** 사용자에게 보여줄 메시지 (미인증 외 실패는 Supabase 원문, 결정 3-1). */
  message: string;
  /** Supabase 에러 코드 (있으면). 로깅·분기용. */
  code?: string;
  /** 이메일 미인증(email not confirmed) 계열 에러 여부 — 전용 안내 분기에 사용. */
  isEmailNotConfirmed: boolean;
}

export type AuthResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: AuthErrorInfo };

/** 앱 안에서 공유하는 인증 세션 상태. */
export interface AuthSession {
  userId: string;
  email: string;
  session: Session;
}
