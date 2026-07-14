import { verifyAccessToken } from '../lib/jwt.js'

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    const err = new Error('인증 토큰이 없습니다.')
    err.status = 401
    return next(err)
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch (e) {
    const err = new Error('토큰이 유효하지 않거나 만료되었습니다.')
    err.status = 401
    next(err)
  }
}
