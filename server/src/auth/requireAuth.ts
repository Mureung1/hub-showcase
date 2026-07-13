import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from './tokens.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: '토큰이 유효하지 않거나 만료되었습니다.' })
  }
}
