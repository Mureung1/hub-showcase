import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createStaffProfile,
  getCurrentStaffProfile,
  type StaffProfile,
} from "../services/apiClient";
import { getSupabaseClient } from "../services/supabaseClient";

const pendingPhoneKey = "baro-jinryo-pending-staff-phone";

interface StaffAuthValue {
  session: Session | null;
  profile: StaffProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, phoneNumber: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<void>;
  completeProfile: (phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

async function resolveProfile(session: Session): Promise<StaffProfile | null> {
  const existing = await getCurrentStaffProfile(session.access_token);
  if (existing) return existing;
  const phoneNumber = window.localStorage.getItem(pendingPhoneKey);
  if (!phoneNumber) return null;
  await createStaffProfile(phoneNumber, session.access_token);
  window.localStorage.removeItem(pendingPhoneKey);
  return getCurrentStaffProfile(session.access_token);
}

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    void client.auth.getSession().then(async ({ data }) => {
      try {
        setSession(data.session);
        setProfile(data.session ? await resolveProfile(data.session) : null);
      } finally {
        setLoading(false);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      window.setTimeout(() => {
        void (nextSession ? resolveProfile(nextSession) : Promise.resolve(null))
          .then(setProfile)
          .finally(() => setLoading(false));
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<StaffAuthValue>(
    () => ({
      session,
      profile,
      loading,
      async signIn(email, password) {
        const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, phoneNumber) {
        window.localStorage.setItem(pendingPhoneKey, phoneNumber);
        const { data, error } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { phone_number: phoneNumber, account_type: "hospital_admin" },
          },
        });
        if (error) {
          window.localStorage.removeItem(pendingPhoneKey);
          throw error;
        }
        if (data.user && data.user.identities?.length === 0) {
          window.localStorage.removeItem(pendingPhoneKey);
          throw new Error("이미 가입된 이메일입니다.");
        }
        return data.session === null;
      },
      async resendConfirmation(email) {
        const { error } = await getSupabaseClient().auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async completeProfile(phoneNumber) {
        if (!session) throw new Error("로그인이 필요합니다.");
        await createStaffProfile(phoneNumber, session.access_token);
        setProfile(await getCurrentStaffProfile(session.access_token));
        window.localStorage.removeItem(pendingPhoneKey);
      },
      async signOut() {
        const { error } = await getSupabaseClient().auth.signOut();
        if (error) throw error;
      },
    }),
    [loading, profile, session],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStaffAuth(): StaffAuthValue {
  const value = useContext(StaffAuthContext);
  if (!value) throw new Error("StaffAuthProvider가 필요합니다.");
  return value;
}
