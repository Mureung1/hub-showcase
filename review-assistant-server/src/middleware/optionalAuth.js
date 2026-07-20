import { getUserByToken } from '../services/auth.service.js'

export function extractToken(req) {
  const header = req.get('Authorization') || ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

// 로그인 여부와 무관하게 통과시킨다 — 익명 사용은 계속 동작해야 하므로 여기서 막지 않는다.
// 로그인돼 있으면 req.user에 { id, email }를, 아니면 null을 채운다.
export function optionalAuth(req, res, next) {
  req.user = getUserByToken(extractToken(req))
  next()
}
