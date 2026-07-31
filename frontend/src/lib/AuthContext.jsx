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

      // 확인 메일의 링크가 돌아올 곳을 현재 도메인으로 명시한다.
      // 지정하지 않으면 Supabase의 Site URL(기본 localhost)로 돌아가 배포본에서 연결 거부가 난다.
      // (이 주소는 Supabase Auth의 Redirect URLs 허용 목록에도 있어야 한다 — docs/DEPLOY.md 참조)
      signUpWithEmail: (email, password) =>
        supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        }),
      signInWithEmail: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signInWithProvider: (provider) =>
        supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin },
        }),
      signOut: () => supabase.auth.signOut(),

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
