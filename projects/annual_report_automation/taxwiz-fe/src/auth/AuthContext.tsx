// 로그인 세션 컨텍스트 — supabase-js가 localStorage에 관리하는 세션을 React 트리에 노출한다.
// 세션 획득이 끝나기 전(loading)에는 리다이렉트 판단을 하지 않는다(새로고침 시 로그인 풀림 방지).
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthCtx = createContext<AuthState>({ session: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
};

export function useAuth(): AuthState {
  return useContext(AuthCtx);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
