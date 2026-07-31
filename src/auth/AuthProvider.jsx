import { createContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseAuthConfigured } from "./supabaseClient.js";
import { toFriendlyAuthError } from "./authErrorMessages.js";
import { normalizeUsername, usernameToAuthEmail } from "./authIdentity.js";

export const AuthContext = createContext(null);
const GUEST_DEMO_SESSION_KEY = "uniradar.guest-demo.active";

function readGuestDemoSession() {
  try {
    return window.sessionStorage.getItem(GUEST_DEMO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isGuestDemo, setIsGuestDemo] = useState(readGuestDemoSession);

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

  async function signIn({ username, password }) {
    if (!supabase) throw new Error("Supabase 인증 환경변수가 설정되지 않았습니다.");
    setAuthError(null);
    const email = usernameToAuthEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message = toFriendlyAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
    exitGuestDemo();
  }

  function startGuestDemo() {
    try {
      window.sessionStorage.setItem(GUEST_DEMO_SESSION_KEY, "true");
    } catch {
      // The demo still works for the current render when sessionStorage is unavailable.
    }
    setAuthError(null);
    setIsGuestDemo(true);
  }

  function exitGuestDemo() {
    try {
      window.sessionStorage.removeItem(GUEST_DEMO_SESSION_KEY);
    } catch {
      // Storage cleanup should not block returning to the sign-in screen.
    }
    setIsGuestDemo(false);
  }

  async function signUp({ username, password }) {
    if (!supabase) throw new Error("Supabase 인증 환경변수가 설정되지 않았습니다.");
    setAuthError(null);
    const normalizedUsername = normalizeUsername(username);
    const email = usernameToAuthEmail(normalizedUsername);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: normalizedUsername } },
    });
    if (error) {
      const message = toFriendlyAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
    exitGuestDemo();
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
    isGuestDemo,
    exitGuestDemo,
    session,
    signIn,
    signOut,
    signUp,
    startGuestDemo,
    user,
  }), [authError, isAuthLoading, isGuestDemo, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
