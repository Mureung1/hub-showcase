import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { consumeIntentionalSignOut, subscribeToAuthChanges } from "./authService";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./useAuth";
import type { AuthSession } from "./types";

/**
 * 앱 전역 인증 세션 상태 (SPEC-AUTH-002 2장).
 * - 마운트 시 onAuthStateChange를 구독하고 언마운트 시 해지한다. 초기 세션은 구독 즉시
 *   발생하는 INITIAL_SESSION 이벤트로 확인한다(기존 getInitialSession 1회 호출을 대체).
 * - 세션의 단일 소유자는 AuthProvider다. 세션 저장·복원은 Supabase 기본(localStorage) 사용.
 * - SIGNED_OUT이 "직접 로그아웃"이 아니면(만료·타 탭 로그아웃) sessionExpired를 세워
 *   /login에서 만료 안내를 띄운다 (4장). 직접 로그아웃에는 안내를 띄우지 않는다.
 * - LoginPage·WorkspacePage의 수동 setSession/clearSession은 구독과 idempotent하게 유지한다
 *   (네비게이션 타이밍 레이스 방지 — 동작 동일, 과도한 리팩터링 금지).
 *
 * 컨텍스트 객체와 useAuth 훅은 useAuth.ts에 있다 (react-refresh 규칙).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(({ event, session: next }) => {
      setSessionState(next);
      setStatus("ready");
      if (event === "SIGNED_OUT") {
        // 직접 로그아웃이면 안내 없음, 그 외(만료·타 탭)면 만료 안내를 세운다.
        if (!consumeIntentionalSignOut()) {
          setSessionExpired(true);
        }
      } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // 새 세션·초기 로드에서는 이전 만료 안내를 남기지 않는다.
        setSessionExpired(false);
      }
    });
    return unsubscribe;
  }, []);

  const setSession = useCallback((next: AuthSession) => setSessionState(next), []);
  const clearSession = useCallback(() => setSessionState(null), []);
  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      setSession,
      clearSession,
      sessionExpired,
      clearSessionExpired,
    }),
    [status, session, sessionExpired, setSession, clearSession, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
