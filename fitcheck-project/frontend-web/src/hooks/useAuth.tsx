import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { setAccessToken } from '../services/authToken';
import { fetchMyProfile } from '../services/profileApi';
import { getSupabaseClient, isSupabaseAuthConfigured } from '../services/supabaseClient';
import type { Profile } from '../types/profile';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const next = await fetchMyProfile();
      setProfile(next);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseAuthConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function applySession(next: Session | null) {
      setSession(next);
      setAccessToken(next?.access_token ?? null);

      if (!next) {
        setProfile(null);
        return;
      }

      try {
        const nextProfile = await fetchMyProfile();
        if (!cancelled) setProfile(nextProfile);
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void applySession(data.session).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAccessToken(null);
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAuthenticated: Boolean(session),
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
