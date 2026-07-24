import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) throw new Error('Supabase public env is required')

export const supabase = createClient(url, publishableKey)

async function acquireAnonymousSession(): Promise<Session> {
  const current = await supabase.auth.getSession()
  if (current.data.session) return current.data.session
  const created = await supabase.auth.signInAnonymously()
  if (created.error || !created.data.session) {
    throw created.error ?? new Error('Anonymous sign-in failed')
  }
  return created.data.session
}

// 동시에 여러 번 호출돼도 signInAnonymously가 한 번만 실행되도록 진행 중인 Promise 하나를 공유한다.
// 완료된 session은 캐시하지 않는다: pending은 settle 직후 정리되고, 다음 호출은 getSession()을 다시 확인한다.
let pendingAnonymousSession: Promise<Session> | null = null

export async function ensureAnonymousSession(): Promise<Session> {
  if (!pendingAnonymousSession) {
    pendingAnonymousSession = acquireAnonymousSession().finally(() => {
      pendingAnonymousSession = null
    })
  }
  return pendingAnonymousSession
}

export async function getAccessToken(): Promise<string> {
  const session = await ensureAnonymousSession()
  return session.access_token
}
