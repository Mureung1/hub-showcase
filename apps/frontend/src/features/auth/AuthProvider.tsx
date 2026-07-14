import { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../../shared/api";
import { createAuthProfile } from "./authApi";
import { Profile } from "./authTypes";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  retryProfileCreation: (name: string) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

type SignUpInput = {
  email: string;
  password: string;
  name: string;
};

type SignInInput = {
  email: string;
  password: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const retryProfileCreation = useCallback(async (name: string) => {
    const { data } = await supabaseClient.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error("로그인 세션을 확인할 수 없습니다.");
    }

    const response = await createAuthProfile(accessToken, name);
    setProfile(response.profile);
  }, []);

  const signUp = useCallback(
    async ({ email, password, name }: SignUpInput) => {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("회원가입은 처리됐지만 로그인 세션이 없습니다. 이메일 인증 설정을 확인한 뒤 다시 로그인해주세요.");
      }

      const response = await createAuthProfile(accessToken, name);
      setProfile(response.profile);
    },
    []
  );

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      signUp,
      retryProfileCreation,
      signIn,
      signOut
    }),
    [isLoading, profile, retryProfileCreation, session, signIn, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
