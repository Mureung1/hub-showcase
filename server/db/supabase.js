import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    '[db] SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 .env에 없습니다.\n' +
      '     .env.example의 주석을 참고해 .env를 채운 뒤 다시 실행하세요.',
  )
  process.exit(1)
}

// Secret key 클라이언트 — 서버 전용. 브라우저로 절대 내려보내지 않는다.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
})
