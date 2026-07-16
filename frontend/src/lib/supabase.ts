import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) throw new Error('Supabase public env is required')

export const supabase = createClient(url, publishableKey)

export async function ensureAnonymousSession() {
  const current = await supabase.auth.getSession()
  if (current.data.session) return current.data.session
  const created = await supabase.auth.signInAnonymously()
  if (created.error || !created.data.session) {
    throw created.error ?? new Error('Anonymous sign-in failed')
  }
  return created.data.session
}

export async function getAccessToken(): Promise<string> {
  const session = await ensureAnonymousSession()
  return session.access_token
}
