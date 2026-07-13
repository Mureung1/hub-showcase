// Supabase 연결. service_role 키는 RLS를 우회하므로 서버 코드에서만 쓰고
// 프론트엔드로는 절대 노출하지 않는다 (CLAUDE.md 개발 원칙 — 네이버 Client Secret과 동일한 취급).
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
