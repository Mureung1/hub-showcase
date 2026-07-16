import { httpError } from '../lib/httpError.js'

/*
 * 임시 사용자 식별 (T-03 결정): 로그인 구현 전까지 X-User-Id 헤더로 요청자를 식별한다.
 * 로그인(C1) 도입 시 이 미들웨어를 토큰 검증으로 교체한다.
 */
export function requireUser(req, res, next) {
  const raw = req.get('X-User-Id')
  const userId = Number(raw)
  if (!raw || !Number.isInteger(userId) || userId <= 0) {
    return next(httpError(401, '사용자 식별 정보가 없습니다. 역할을 먼저 선택해주세요.'))
  }
  req.userId = userId
  next()
}
