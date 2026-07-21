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

  const value = { user: session?.user ?? null, session, loading, signUp, signIn, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
