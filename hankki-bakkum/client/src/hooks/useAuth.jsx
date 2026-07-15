import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // 로그인한 auth 유저
  const [profile, setProfile] = useState(null); // users 테이블의 프로필(role 포함)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 새로고침해도 로그인 유지 + 로그인/로그아웃 때마다 자동 반영
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data } = await supabase.from('users').select('*').eq('id', u.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}