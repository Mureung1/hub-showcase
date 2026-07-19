import { createContext, useContext } from "react";
import type { AuthSession } from "./types";

/**
 * Auth 컨텍스트의 값·훅 (컴포넌트가 아닌 모듈).
 * Provider는 AuthContext.tsx에 둔다 (react-refresh 규칙: 컴포넌트 파일은 컴포넌트만 export).
 */
export type AuthStatus = "loading" | "ready";

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  /** 만료·타 탭 로그아웃 등 의도치 않은 세션 종료 여부 (SPEC-AUTH-002 4장). 직접 로그아웃에는 false. */
  sessionExpired: boolean;
  /** 만료 안내를 소비(해제)한다 — 새로고침·화면 이탈 후 문구가 남지 않게 한다. */
  clearSessionExpired: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
