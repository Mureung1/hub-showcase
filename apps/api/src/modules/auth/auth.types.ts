import type { Request } from "express";

/**
 * 인증 경계 타입 (SPEC-AUTH-003 2.3).
 * Auth Middleware가 검증된 JWT에서만 채우는 인증 사용자 정보.
 * userId는 반드시 검증 결과에서만 온다 — 클라이언트가 보낸 값은 신뢰하지 않는다.
 */
export interface AuthInfo {
  userId: string;
  email: string;
  /**
   * 검증된 access token. 사용자 JWT Supabase Client(RLS) 생성에 사용한다(SPEC-DB-001).
   * 이미 헤더로 받은 값이며, 데이터 소유권은 여전히 userId(검증 결과)로만 판단한다.
   */
  token: string;
}

/**
 * Express Request에 `req.auth`를 타입 안전하게 노출한다(선언 병합).
 * Auth Middleware를 통과한 요청에서만 존재하므로 optional로 둔다.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthInfo;
    }
  }
}

/**
 * Auth Middleware 이후 Controller가 받는 요청 — `auth`가 채워져 있음을 표현한다.
 */
export interface AuthenticatedRequest extends Request {
  auth: AuthInfo;
}
