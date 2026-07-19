import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useAuth } from "./useAuth";

/**
 * 비로그인 진입을 막는 최소 가드 (SPEC-AUTH-001 2장).
 * 초기 세션 확인(loading) 중에는 스피너를 보여주고, 세션이 없으면 /login으로 보낸다.
 * 새로고침 복원·가드 고도화는 SPEC-AUTH-002 범위이므로 여기서는 단순 처리만 한다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();

  if (status === "loading") {
    return (
      <Center axis="both" minHeight="100vh">
        <Spinner label="세션을 확인하는 중…" />
      </Center>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
