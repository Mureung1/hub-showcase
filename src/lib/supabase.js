// Supabase 클라이언트 단일 인스턴스. 인증(auth)에만 쓴다 — 데이터(프로필/식단)는 아직 localStorage 그대로.
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY는 anon key라 브라우저에 노출돼도 안전하다(RLS로 보호되는 값).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 설정이 없습니다. .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정해주세요.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
