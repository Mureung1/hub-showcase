import { createClient } from '@supabase/supabase-js'

// service_role 키를 쓴다 — RLS를 우회하는 백엔드 전용 키라서, ANTHROPIC_API_KEY와
// 같은 원칙으로 절대 프론트엔드에 노출하지 않는다.
// 이 인스턴스로는 절대 auth.signInWithPassword/auth.getUser를 호출하지 않는다 — 호출하는
// 순간 이 클라이언트의 내부 세션이 그 유저로 바뀌면서, 이후 모든 .from() DB 쿼리가
// service_role이 아니라 그 유저 권한으로 나가버려 RLS에 막힌다(실제로 겪은 버그).
// admin.* API는 세션을 안 건드리므로 이 인스턴스에서 호출해도 안전하다.
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// signInWithPassword/getUser처럼 세션을 만들거나 읽는 호출은 매번 새 인스턴스로 분리한다 —
// 위 supabase 인스턴스와 세션 상태를 공유하지 않게 하기 위함. anon 키를 쓴다(공개용 키라 안전).
export function createAuthClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
