import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

// 인증 미들웨어: Authorization: Bearer {token} 헤더를 검증해서 req.user에 사용자 정보를 담아준다
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  // 1. 토큰 추출 (Authorization: Bearer {token} 형식이 아니면 토큰 없음으로 처리)
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!token) {
    return res.status(401).json({ message: '로그인이 필요합니다' })
  }

  try {
    // 2. 토큰 검증 및 디코딩
    const decoded = jwt.verify(token, env.jwtSecret)

    // 3. 다음 미들웨어/컨트롤러에서 쓸 수 있도록 사용자 정보를 req.user에 저장
    req.user = { userId: decoded.userId, username: decoded.username }

    next()
  } catch {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다' })
  }
}
