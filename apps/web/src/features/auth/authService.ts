import { AuthError, type Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { AuthResult, AuthSession } from "./types";

/**
 * Supabase Auth SDK 호출을 이 서비스에 캡슐화한다 (SPEC-AUTH-001 5장, CLAUDE.md 7장).
 * 컴포넌트·페이지는 SDK를 직접 호출하지 않고 이 서비스(또는 useAuth)를 거친다.
 */

const NOT_CONFIGURED_MESSAGE =
  "인증 서버가 아직 연결되지 않았습니다. 관리자에게 문의하거나 환경변수를 확인해주세요.";

/** 인증 링크 클릭 후 도착할 앱의 로그인 경로 (결정 2-3). */
function loginRedirectUrl(): string {
  return `${window.location.origin}/login`;
}

/** Supabase의 email-not-confirmed 계열 에러인지 판별한다 (결정 3-1 예외 분기). */
function isEmailNotConfirmed(error: AuthError): boolean {
  return (
    error.code === "email_not_confirmed" ||
    /email not confirmed|not been confirmed/i.test(error.message)
  );
}

function toErrorResult(error: AuthError): AuthResult<never> {
  // MVP 디버깅 편의를 위해 원문 메시지를 그대로 노출하되(결정 3-1), 콘솔에도 남긴다.
  console.error("[auth]", error.code ?? "", error.message);
  return {
    ok: false,
    error: {
      message: error.message,
      code: error.code,
      isEmailNotConfirmed: isEmailNotConfirmed(error),
    },
  };
}

function notConfiguredResult(): AuthResult<never> {
  console.error("[auth] Supabase 미설정 상태에서 인증 동작이 호출되었습니다.");
  return {
    ok: false,
    error: { message: NOT_CONFIGURED_MESSAGE, isEmailNotConfirmed: false },
  };
}

function toAuthSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    session,
  };
}

/** 회원가입 — 성공 시 인증 메일이 발송된다. 자동 로그인은 하지 않는다 (결정 2-3). */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return notConfiguredResult();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: loginRedirectUrl() },
  });
  if (error) return toErrorResult(error);
  return { ok: true, value: undefined };
}

/** 인증 메일 재발송 (SPEC-AUTH-001 3장·4.2). */
export async function resendConfirmation(email: string): Promise<AuthResult> {
  if (!supabase) return notConfiguredResult();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: loginRedirectUrl() },
  });
  if (error) return toErrorResult(error);
  return { ok: true, value: undefined };
}

/** 로그인 — 성공 시 세션을 반환한다. */
export async function signIn(email: string, password: string): Promise<AuthResult<AuthSession>> {
  if (!supabase) return notConfiguredResult();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return toErrorResult(error);
  if (!data.session) {
    return {
      ok: false,
      error: { message: "세션을 생성하지 못했습니다.", isEmailNotConfirmed: false },
    };
  }
  return { ok: true, value: toAuthSession(data.session) };
}

/** 로그아웃. */
export async function signOut(): Promise<AuthResult> {
  if (!supabase) return notConfiguredResult();
  const { error } = await supabase.auth.signOut();
  if (error) return toErrorResult(error);
  return { ok: true, value: undefined };
}

/**
 * 초기 진입 시 1회 세션 확인 (SPEC-AUTH-001 2장).
 * 새로고침 복원·토큰 갱신 고도화는 SPEC-AUTH-002 범위이므로 여기서는 현재 세션만 읽는다.
 */
export async function getInitialSession(): Promise<AuthSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] 세션 확인 실패:", error.message);
    return null;
  }
  return data.session ? toAuthSession(data.session) : null;
}
