import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getInitialSession } from "./authService";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./useAuth";
import type { AuthSession } from "./types";

/**
 * 앱 전역 인증 세션 상태 (SPEC-AUTH-001 2장).
 * - 마운트 시 1회 세션 확인(getInitialSession)만 수행한다. onAuthStateChange 구독·
 *   토큰 갱신 처리 등 세션 복원 고도화는 SPEC-AUTH-002 범위라 하지 않는다.
 * - 로그인 성공 시 setSession, 로그아웃 시 clearSession으로 세션 내(페이지 이동)에서
 *   상태를 갱신한다.
 *
 * 컨텍스트 객체와 useAuth 훅은 useAuth.ts에 있다 (react-refresh 규칙).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSessionState] = useState<AuthSession | null>(null);

  useEffect(() => {
    let active = true;
    void getInitialSession().then((result) => {
      if (!active) return;
      setSessionState(result);
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      setSession: setSessionState,
      clearSession: () => setSessionState(null),
    }),
    [status, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
