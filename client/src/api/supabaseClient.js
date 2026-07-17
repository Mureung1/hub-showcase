import { createClient } from "@supabase/supabase-js"

// anon 공개 키 — 브라우저에 노출돼도 안전하며, 실제 접근 제어는 서버가
// service role 키로 검증하는 쪽에서 담당한다(server/src/middleware/auth.js).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
