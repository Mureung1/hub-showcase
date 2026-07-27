import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../api/supabaseClient';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // 앱 마운트 시 Supabase 세션 자동 복구
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error('세션 복구 실패:', e);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Supabase Auth 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // profiles 테이블에서 유저 정보 조회
  const fetchProfile = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (!data) {
          // profiles에 정보가 없는 경우 (Magic Link 클릭 등으로 Auth만 생성된 상태)
          console.warn('Profile not found for this user. Might be an incomplete signup.');
          await supabase.auth.signOut();
          setCurrentUser(null);
          setIsLoggedIn(false);
          return;
        }

        const user = {
          id: userId,
          username: data.username,
          email: data.email,
          email_verified: data.email_verified
        };
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.error('프로필 조회 실패:', e);
    }
  };

  // 로그인 (아이디 → email 조회 → Supabase Auth 로그인)
  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '아이디 또는 비밀번호가 올바르지 않습니다');
    }

    // 백엔드에서 받은 이메일로 Supabase Auth 로그인
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: password
    });

    if (error) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    await fetchProfile(data.userId);
    return data;
  };

  // 로그아웃
  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  // 회원가입 (Supabase Auth 유저 생성 + profiles 저장)
  const signup = async (email, password, username, userId = null) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, userId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '회원가입에 실패했습니다');
    }

    // 가입 후 자동 로그인
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error('가입은 완료되었으나 자동 로그인에 실패했습니다. 직접 로그인해 주세요.');
    }

    await fetchProfile(data.userId);
    return data;
  };


  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoggedIn,
      loading,
      login,
      logout,
      signup
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
