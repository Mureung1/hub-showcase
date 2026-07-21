// Supabase Auth 전용 클라이언트.
// 규칙(CLAUDE.md): 문서 등 "데이터"는 backend REST를 통해서만 접근한다.
// 단, 인증(이메일/OAuth)은 Supabase Auth를 프론트에서 직접 쓰는 것이 표준 흐름이라 예외다.
// 여기서 쓰는 것은 anon(public) 키뿐 — service-role 키/LLM 키는 절대 프론트에 두지 않는다.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 키가 없으면(로컬에 .env 미설정) 인증 UI를 비활성화하기 위해 null 을 export.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isAuthEnabled = Boolean(supabase)
