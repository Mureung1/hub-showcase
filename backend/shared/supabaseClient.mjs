import { createClient } from '@supabase/supabase-js'

export function createSupabaseServerClient({ url, secretKey }) {
  if (!url || !secretKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required in supabase repository mode')
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
