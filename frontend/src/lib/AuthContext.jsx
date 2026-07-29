// 로그인 세션 전역 상태. Supabase Auth 세션을 구독하고, 그 access token을
// api.js(백엔드 호출 래퍼)에 흘려보낸다. 앱 전체를 <AuthProvider>로 감싼다.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isAuthEnabled } from './supabaseClient.js'
import { setAuthToken, request } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isAuthEnabled)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    // 최초 세션 로드 + 이후 변화 구독.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthToken(data.session?.access_token)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null)
      setAuthToken(next?.access_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => {
    const user = session?.user ?? null
    return {
      isAuthEnabled,
      loading,
      session,
      user,
      isLoggedIn: Boolean(user),

      signUpWithEmail: (email, password) => supabase.auth.signUp({ email, password }),
      signInWithEmail: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signInWithProvider: (provider) =>
        supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin },
        }),
      signOut: () => supabase.auth.signOut(),

      // 비밀번호 재설정 메일 발송 → 메일 링크가 /update-password로 돌아온다.
      resetPassword: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        }),
      // 로그인/복구 세션 상태에서 새 비밀번호 설정.
      updatePassword: (password) => supabase.auth.updateUser({ password }),
      // 이메일 변경 — Supabase가 확인 메일을 보낸다(보안 이메일 변경).
      updateEmail: (email) => supabase.auth.updateUser({ email }),
      // 비번 변경 전 본인 확인용 — 현재 비번으로 재로그인 시도.
      reauthenticate: (email, currentPassword) =>
        supabase.auth.signInWithPassword({ email, password: currentPassword }),

      // 프로필 조회/갱신(백엔드 경유). 로그인 상태에서만 의미가 있다.
      getProfile: () => request('/profile'),
      updateProfile: (patch) => request('/profile', { method: 'PATCH', body: patch }),
    }
  }, [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
