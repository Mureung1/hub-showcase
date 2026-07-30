import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import { env } from './env.js'

export const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null

export function requireSupabase(res: Response): SupabaseClient | null {
  if (supabase) return supabase
  console.error('Supabase client is not configured')
  res.status(500).json({ error: '서버 오류가 발생했어요' })
  return null
}
