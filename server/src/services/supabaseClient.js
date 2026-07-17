import { createClient } from "@supabase/supabase-js"

// service role 키 — RLS를 우회하는 대신, 모든 쿼리는 호출부에서 반드시
// user_id로 직접 필터링한다(middleware/auth.js가 뽑아주는 req.userId 사용).
// 이 클라이언트는 서버 전용이며 절대 프론트엔드로 노출하지 않는다.
//
// 지연 초기화: createClient는 URL/키가 없으면 즉시 throw하는데, 모듈
// 최상단에서 호출하면 Supabase 설정 전엔 이 파일을 import하는 순간 서버
// 전체(대시보드/기사 등 무관한 라우트 포함)가 부팅조차 못 하게 된다.
// 실제로 단어장 기능을 쓸 때만 에러가 나도록 첫 사용 시점까지 생성을 미룬다.
let client = null

export function getSupabase() {
  if (!client) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (server/.env 확인)")
    }
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  return client
}
