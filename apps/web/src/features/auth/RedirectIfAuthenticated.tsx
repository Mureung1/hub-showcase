import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useAuth } from "./useAuth";

/**
 * 역방향 가드 (SPEC-AUTH-002 3장): 로그인 상태에서 `/login`·`/signup` 진입 시 `/`로 보낸다.
 * 초기 세션 확인 중에는 중앙 스피너를 보여 로그인 폼이 잠깐 깜빡이는 것을 막는다.
 * `/verify-email`은 이 가드의 대상이 아니다(현재 동작 유지).
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();

  if (status === "loading") {
    return (
      <Center axis="both" minHeight="100vh">
        <Spinner label="세션을 확인하는 중…" />
      </Center>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
