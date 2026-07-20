import { createContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseAuthConfigured } from "./supabaseClient.js";

export const AuthContext = createContext(null);

function toFriendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "이메일 또는 비밀번호를 확인해 주세요.";
  if (message.includes("email not confirmed")) return "이메일 인증을 완료한 뒤 로그인해 주세요.";
  if (message.includes("already registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  return "인증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setAuthError(toFriendlyAuthError(error));
        setSession(data.session || null);
        setUser(data.session?.user || null);
        setIsAuthLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthError("세션 정보를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        setIsAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);
      setAuthError(null);
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn({ email, password }) {
    if (!supabase) throw new Error("Supabase 인증 환경변수가 설정되지 않았습니다.");
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = toFriendlyAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function signUp({ email, password }) {
    if (!supabase) throw new Error("Supabase 인증 환경변수가 설정되지 않았습니다.");
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const message = toFriendlyAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
    return { needsEmailConfirmation: !data.session };
  }

  async function signOut() {
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setAuthError(message);
      throw new Error(message);
    }
  }

  const value = useMemo(() => ({
    authError,
    isAuthLoading,
    isConfigured: supabaseAuthConfigured,
    session,
    signIn,
    signOut,
    signUp,
    user,
  }), [authError, isAuthLoading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}