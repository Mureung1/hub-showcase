import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma.js'

const SESSION_COOKIE = 'sid'
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365

declare global {
  namespace Express {
    interface Request {
      sessionId: string
    }
  }
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.cookies[SESSION_COOKIE] as string | undefined

  if (existingId) {
    const session = await prisma.session.findUnique({ where: { id: existingId } })
    if (session) {
      req.sessionId = session.id
      next()
      return
    }
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const session = await prisma.session.create({ data: {} })
  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: ONE_YEAR_MS,
  })
  req.sessionId = session.id
  next()
}
