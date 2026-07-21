// Supabase Auth JWT 검증 미들웨어.
// 프론트는 로그인 시 access token을 Authorization: Bearer <token> 로 보낸다.
// service-role 클라이언트의 auth.getUser(token) 으로 토큰을 검증하고 req.user 에 담는다.
import { supabase } from '../lib/supabase.js'

function readBearer(req) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

// 토큰이 있으면 검증해서 req.user 를 채우고, 없으면 그냥 통과(익명 허용).
// 목록/조회처럼 로그인 여부와 무관하게 열려 있는 라우트에서 쓴다.
export async function optionalAuth(req, res, next) {
  const token = readBearer(req)
  if (!token) return next()
  const { data, error } = await supabase.auth.getUser(token)
  if (!error && data?.user) req.user = data.user
  next()
}

// 로그인 필수 라우트용. 토큰이 없거나 검증 실패면 401.
export async function requireAuth(req, res, next) {
  const token = readBearer(req)
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user)
    return res.status(401).json({ error: '세션이 만료되었어요. 다시 로그인해 주세요.' })
  req.user = data.user
  next()
}
