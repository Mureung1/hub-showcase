import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentPlatformProfile, type PlatformProfile } from "../services/apiClient";
import { getSupabaseClient } from "../services/supabaseClient";

interface PlatformAuthValue {
  session: Session | null;
  profile: PlatformProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    void client.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setProfile(data.session ? await getCurrentPlatformProfile(data.session.access_token) : null);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      window.setTimeout(() => {
        void (nextSession
          ? getCurrentPlatformProfile(nextSession.access_token)
          : Promise.resolve(null))
          .then(setProfile)
          .finally(() => setLoading(false));
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<PlatformAuthValue>(() => ({
    session,
    profile,
    loading,
    async signIn(email, password) {
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    },
  }), [loading, profile, session]);

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatformAuth(): PlatformAuthValue {
  const value = useContext(PlatformAuthContext);
  if (!value) throw new Error("PlatformAuthProvider가 필요합니다.");
  return value;
}
