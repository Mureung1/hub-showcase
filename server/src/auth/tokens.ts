import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) {
  throw new Error('JWT_SECRET 환경변수가 설정되어 있지 않습니다.')
}
const JWT_SECRET: string = rawSecret

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '30d'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type AccessTokenPayload = {
  sub: string
  jti?: string
}

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload
}

export function signRefreshToken(userId: string) {
  // jti(랜덤 토큰 id)가 없으면 같은 초(iat)에 같은 유저로 두 번 서명할 때 완전히 같은 문자열이 나와
  // tokenHash 유니크 제약과 충돌한다 (동시 refresh 요청 등에서 실제로 발생).
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() } satisfies AccessTokenPayload,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL },
  )
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
