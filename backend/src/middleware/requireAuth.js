// Supabase 세션 토큰(JWT) 검증 미들웨어.
// 프론트가 `Authorization: Bearer <access_token>` 헤더로 보내는 토큰을
// SUPABASE_JWT_SECRET으로 서명 검증해서, 성공하면 req.userId에 사용자 id를 담는다.
// 네트워크 호출 없이 로컬에서 서명만 확인하므로 빠르다.
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!token) {
    return res.status(401).json({ error: '로그인이 필요해요.' })
  }

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' })
  }
}
