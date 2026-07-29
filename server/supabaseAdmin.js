// FR-21/FR-15 — SERVICE_ROLE_KEY로 RLS를 우회하는 서버 전용 Supabase 클라이언트. 절대 프론트에
// 노출하지 않는다(VITE_ 접두사를 붙이지 않고, 이 파일도 server/ 아래에서만 import한다). 비밀번호
// 찾기(security_questions 조회/비밀번호 변경, FR-21)와 리더보드 가상 유저 시딩 스크립트(FR-15)가
// 공유한다.
import { createClient } from '@supabase/supabase-js'

let client = null

export function getSupabaseAdmin() {
  if (client) return client
  // VITE_SUPABASE_URL은 클라이언트 번들에 이미 노출되는 값(프로젝트 URL 자체는 비밀이 아님)이라
  // 서버 전용 URL 변수를 새로 만들지 않고 그대로 재사용한다.
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있지 않습니다')
  }
  client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  return client
}

// 테스트에서 모듈 캐시를 초기화하고 싶을 때만 사용.
export function _resetForTest() {
  client = null
}
