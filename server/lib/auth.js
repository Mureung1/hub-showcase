// 인증 공용 헬퍼 — JWT 발급/검증 + httpOnly 쿠키 관리.
// 토큰은 브라우저 JS가 읽을 수 없는 httpOnly 쿠키에만 담아 XSS 탈취를 막는다.
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'session'
const DAY = 24 * 60 * 60 // 초
const DEFAULT_MAX_AGE = 7 * DAY // 기본 7일
const REMEMBER_MAX_AGE = 30 * DAY // "로그인 상태 유지" 30일

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET이 .env에 없습니다. 임의의 랜덤 문자열을 넣어 주세요.')
  return s
}

function cookieOptions(maxAgeSec) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    // 같은 오리진 배포라 Lax면 충분 — 크로스사이트 요청엔 쿠키가 안 실려 CSRF를 막는다.
    sameSite: 'lax',
    secure: isProd, // 배포(https)에서만 secure — 로컬 http는 false
    maxAge: maxAgeSec * 1000, // res.cookie의 maxAge는 밀리초
    path: '/',
  }
}

// userId를 담은 JWT 발급
export function signToken(userId, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
  return jwt.sign({ sub: userId }, secret(), { expiresIn: maxAge })
}

// 발급한 토큰을 httpOnly 쿠키로 응답에 심는다
export function setAuthCookie(res, token, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
  res.cookie(COOKIE_NAME, token, cookieOptions(maxAge))
}

// 로그아웃 — 쿠키 제거
export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production'
  // 지울 때도 발급 때와 같은 속성이어야 브라우저가 해당 쿠키를 매칭해 제거한다.
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' })
}

// 요청 쿠키의 JWT에서 userId를 꺼낸다. 없거나 무효/만료면 null.
export function userIdFromReq(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    return jwt.verify(token, secret()).sub
  } catch {
    return null
  }
}
