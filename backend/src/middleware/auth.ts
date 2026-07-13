import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

export const verifyAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.decode(token) as Record<string, any>
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다' })
    }

    req.userId = decoded.sub
    next()
  } catch (error) {
    return res.status(401).json({ error: '토큰 검증 실패' })
  }
}
