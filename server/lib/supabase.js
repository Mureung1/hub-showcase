import { createClient } from '@supabase/supabase-js'

let supabaseClient

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    const error = new Error(
      'Supabase 연결 정보가 없습니다. server/.env를 확인해 주세요.',
    )
    error.status = 503
    throw error
  }

  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}
