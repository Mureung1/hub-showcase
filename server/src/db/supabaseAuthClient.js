import { createClient } from '@supabase/supabase-js'

// 토큰 검증 전용 — anon key만 사용하는 최소 권한 클라이언트. RLS를 우회하지 않는다.
// requireSupabaseAuth 미들웨어가 매 요청마다 auth.getUser(token)으로 검증을 여기 위임한다
// (이 프로젝트는 비대칭 서명 키를 쓰므로 jsonwebtoken 오프라인 검증 대신 이 방식을 쓴다).
export const supabaseAuthClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
)
