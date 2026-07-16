import { createClient } from '@supabase/supabase-js'

// 서비스 롤 키는 backend에서만 사용한다(CLAUDE.md 규칙). frontend 번들에 절대 노출하지 않는다.
const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 backend/.env 에 설정되어야 합니다.')
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
})
