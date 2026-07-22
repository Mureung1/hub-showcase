import { createClient } from '@supabase/supabase-js'

// service_role key로 RLS를 우회해 북마크 CRUD를 수행하는 관리자 클라이언트.
// 로컬 SQLite의 db(connection.js)와 나란히 두는 "북마크 전용 DB 핸들" 역할 —
// jobs/analysis_results는 여전히 로컬 SQLite, bookmarks만 Supabase Postgres에 있다.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)
