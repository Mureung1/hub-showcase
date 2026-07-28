import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: string;
};

type SignInOptions = {
  redirectView?: "workspace";
  openAnalysis?: boolean;
};

const initialAuthState: AuthState = {
  session: null,
  user: null,
  isLoading: true,
  error: "",
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      setAuthState({
        session: data.session,
        user: data.session?.user ?? null,
        isLoading: false,
        error: error?.message ?? "",
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setAuthState((current) => ({
        ...current,
        session,
        user: session?.user ?? null,
        isLoading: false,
        error: "",
      }));
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = async ({ redirectView, openAnalysis }: SignInOptions = {}) => {
    setAuthState((current) => ({ ...current, isLoading: true, error: "" }));

    const redirectUrl = new URL(
      import.meta.env.BASE_URL,
      window.location.origin,
    );

    if (redirectView) {
      redirectUrl.searchParams.set("view", redirectView);
    }

    if (openAnalysis) {
      redirectUrl.searchParams.set("start", "analysis");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setAuthState((current) => ({
        ...current,
        isLoading: false,
        error: "GitHub 로그인에 실패했습니다. Supabase Provider 설정을 확인해 주세요.",
      }));
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthState((current) => ({
        ...current,
        error: "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      }));
    }
  };

  return {
    ...authState,
    signInWithGitHub,
    signOut,
  };
}
