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
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
