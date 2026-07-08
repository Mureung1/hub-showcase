import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Supabase 인증 세션을 구독하는 훅.
 * - supabase 환경변수가 없으면 항상 세션 없음(loading=false) 상태를 반환한다.
 */
export function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return
        setSession(nextSession)
      },
    )

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
