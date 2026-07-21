import { createClient } from '@supabase/supabase-js'

// 로그인/북마크(#19/#20) 전용 — 갭 분석 관련 데이터(jobs/analysis_results)는 여전히
// 기존 Express+better-sqlite3(src/api/gapAnalysis.js)를 그대로 쓴다. 이 클라이언트는
// Supabase Auth 호출과, 인증된 요청에 실어 보낼 액세스 토큰을 읽는 용도로만 쓰인다.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
