import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// AppStateContext(filters/spec/result — 갭 분석 진행 상태)와는 완전히 다른 관심사라 별도 Context로
// 분리했다(checklist_3_login_bookmark.md의 결정). 세션 자체는 Supabase 클라이언트가 로컬스토리지에
// 알아서 저장/복원하므로, 여기서는 그 상태를 구독해서 React 트리에 노출하는 역할만 한다.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  function signUp({ email, password }) {
    return supabase.auth.signUp({ email, password })
  }

  function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  function signOut() {
    return supabase.auth.signOut()
  }

  // 재설정 이메일의 링크가 이 redirectTo로 돌아온다 — /reset-password가 그 도착 페이지다.
  // 이 URL은 Supabase 대시보드의 Redirect URLs 허용목록에 등록돼 있어야 실제로 동작한다.
  function resetPasswordForEmail({ email }) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }

  // 재설정 링크를 클릭하면 Supabase가 이미 세션(user)을 심어준 상태이므로, 이 호출은 그 세션으로
  // 비밀번호만 바꾼다 — 별도 로그인 호출 없이 그대로 로그인 상태가 유지된다.
  function updatePassword({ password }) {
    return supabase.auth.updateUser({ password })
  }

  const value = {
    user: session?.user ?? null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
