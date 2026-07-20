import { createClient } from '@supabase/supabase-js'

// Supabase 접속 클라이언트 하나를 만들어 내보낸다.
//  .env의 URL + Secret키로 연결 — Secret키라 RLS를 우회해 서버에서 자유롭게 읽고 쓴다.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
)
