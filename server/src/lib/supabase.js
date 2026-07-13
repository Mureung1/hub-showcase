import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
}

export function createSupabaseClient(accessToken) {
  const options = {
    auth: authOptions,
  }

  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, options)
}
