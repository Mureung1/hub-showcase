// Supabase 세션 토큰(JWT) 검증 미들웨어.
// 프론트가 `Authorization: Bearer <access_token>` 헤더로 보내는 토큰을
// Supabase의 공개키(JWKS)로 서명 검증해서, 성공하면 req.userId에 사용자 id를 담는다.
// 이 프로젝트는 비대칭 서명 키(ES256)를 쓰기 때문에 고정 시크릿(HS256) 검증은 항상 실패한다.
// createRemoteJWKSet은 공개키를 최초 1회 가져와 캐싱하고, 모르는 kid가 오면 자동으로 재조회한다
// (요청마다 네트워크를 타지 않는다는 원래 설계 의도를 최대한 유지).
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('/auth/v1/.well-known/jwks.json', process.env.SUPABASE_URL),
)

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!token) {
    return res.status(401).json({ error: '로그인이 필요해요.' })
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    })
    req.userId = payload.sub
    next()
  } catch (err) {
    // 임시 디버그 로그 — 토큰/시크릿 값은 남기지 않고 실패 사유만 확인한다.
    console.error('[requireAuth] JWT 검증 실패:', err.code || err.name, err.message, err.cause || '')
    res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' })
  }
}
