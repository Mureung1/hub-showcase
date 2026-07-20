import { AuthError, type AuthChangeEvent, type Session } from "@supabase/supabase-js";
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

/**
 * "사용자가 직접 로그아웃"과 "만료·타 탭 로그아웃"을 구분하기 위한 플래그
 * (SPEC-AUTH-002 4장). 직접 로그아웃 직전에 세워지고, 구독 핸들러가 소비한다.
 * 직접 로그아웃에는 만료 안내를 표시하지 않는다.
 */
let intentionalSignOut = false;

/** 직접 로그아웃 플래그를 읽고 초기화한다 (SIGNED_OUT 이벤트 처리 시 1회 소비). */
export function consumeIntentionalSignOut(): boolean {
  const value = intentionalSignOut;
  intentionalSignOut = false;
  return value;
}

/** 로그아웃. 이후 발생하는 SIGNED_OUT 이벤트는 "직접 로그아웃"으로 표시한다. */
export async function signOut(): Promise<AuthResult> {
  if (!supabase) return notConfiguredResult();
  intentionalSignOut = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    intentionalSignOut = false;
    return toErrorResult(error);
  }
  return { ok: true, value: undefined };
}

/**
 * 현재 Supabase 세션의 access token을 반환한다 (SPEC-AUTH-003 4장).
 * ApiClient가 Authorization: Bearer 첨부에 사용한다 — SDK 직접 호출을 이 서비스에 캡슐화해
 * 컴포넌트·ApiClient가 Supabase SDK를 직접 만지지 않게 한다.
 * 세션이 없거나 미설정이면 null을 반환한다(호출부가 미인증으로 처리).
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** 정규화된 세션 변화 이벤트 (SPEC-AUTH-002 2장). */
export interface AuthStateChange {
  event: AuthChangeEvent;
  session: AuthSession | null;
}

/**
 * Supabase Auth 상태 변화를 구독한다 (SPEC-AUTH-002 2장).
 * - 등록 즉시 INITIAL_SESSION 이벤트로 현재 세션을 통지한다(초기 확인 대체).
 * - SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED 등 모든 변화를 정규화해 전달한다.
 * - 토큰 자동 갱신은 Supabase Client 기본값(autoRefreshToken)을 사용한다.
 * - 미설정(isSupabaseConfigured=false) 상태에서는 세션 없음을 1회 통지하고 no-op 해지자를 반환한다.
 * 반환값은 구독 해지 함수다 (언마운트 시 호출).
 */
export function subscribeToAuthChanges(
  onChange: (change: AuthStateChange) => void,
): () => void {
  if (!supabase) {
    onChange({ event: "INITIAL_SESSION", session: null });
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange({ event, session: session ? toAuthSession(session) : null });
  });
  return () => data.subscription.unsubscribe();
}
