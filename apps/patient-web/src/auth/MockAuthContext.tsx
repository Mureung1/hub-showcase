import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const storageKey = "baro-jinryo-mock-patient-session";

interface MockPatientSession {
  email: string;
}

interface MockAuthValue {
  session: MockPatientSession | null;
  signIn: (email: string) => void;
  signOut: () => void;
}

const MockAuthContext = createContext<MockAuthValue | null>(null);

function readSession(): MockPatientSession | null {
  const saved = window.sessionStorage.getItem(storageKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MockPatientSession;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MockPatientSession | null>(readSession);
  const value = useMemo<MockAuthValue>(
    () => ({
      session,
      signIn(email) {
        const nextSession = { email };
        window.sessionStorage.setItem(storageKey, JSON.stringify(nextSession));
        setSession(nextSession);
      },
      signOut() {
        window.sessionStorage.removeItem(storageKey);
        setSession(null);
      },
    }),
    [session],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth(): MockAuthValue {
  const value = useContext(MockAuthContext);
  if (!value) throw new Error("MockAuthProvider가 필요합니다.");
  return value;
}
