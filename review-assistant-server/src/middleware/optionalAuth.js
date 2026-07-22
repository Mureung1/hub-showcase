import { getUserByToken } from '../services/auth.service.js'

export function extractToken(req) {
  const header = req.get('Authorization') || ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

// 로그인 여부와 무관하게 통과시킨다 — 익명 사용은 계속 동작해야 하므로 여기서 막지 않는다.
// 로그인돼 있으면 req.user에 { id, email }를, 아니면 null을 채운다.
// getUserByToken이 Supabase Auth API를 호출하는 async 함수가 됐지만, 실패해도(네트워크
// 오류 등) 절대 요청을 막지 않는다는 "optional" 원칙은 그대로 유지 — 실패 시 조용히 null.
export async function optionalAuth(req, res, next) {
  try {
    req.user = await getUserByToken(extractToken(req))
  } catch {
    req.user = null
  }
  next()
}
