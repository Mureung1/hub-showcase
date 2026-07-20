import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import {
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/tokens.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { DEFAULT_CATEGORY_TEMPLATE } from '../constants.js'

export const authRouter = Router()

const REFRESH_COOKIE = 'refreshToken'
const isProduction = process.env.NODE_ENV === 'production'

function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  })
}

async function issueSession(res: import('express').Response, userId: string) {
  const refreshToken = signRefreshToken(userId)

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  })

  setRefreshCookie(res, refreshToken)
  return signAccessToken(userId)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { email, password, name } = body as Record<string, unknown>
  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(name)) {
    res.status(400).json({ error: 'email, password, name은 필수입니다.' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: '이미 가입된 이메일입니다.' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, passwordHash, name } })
  await prisma.category.createMany({
    data: DEFAULT_CATEGORY_TEMPLATE.map((template) => ({ ...template, userId: user.id })),
  })
  const accessToken = await issueSession(res, user.id)

  res.status(201).json({ accessToken, user: { id: user.id, email: user.email, name: user.name } })
}))

authRouter.post('/login', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { email, password } = body as Record<string, unknown>
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    res.status(400).json({ error: 'email, password는 필수입니다.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !passwordMatches) {
    res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    return
  }

  const accessToken = await issueSession(res, user.id)
  res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } })
}))

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE]
  if (!isNonEmptyString(token)) {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return
  }

  let userId: string
  try {
    userId = verifyRefreshToken(token).sub
  } catch {
    res.status(401).json({ error: 'refresh token이 유효하지 않습니다.' })
    return
  }

  const tokenHash = hashToken(token)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'refresh token이 무효화되었거나 만료되었습니다.' })
    return
  }

  // 토큰 회전: 쓰던 refresh token은 즉시 폐기하고 새 걸 발급 (탈취된 토큰 재사용 창을 줄임)
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
  const accessToken = await issueSession(res, userId)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(401).json({ error: '유저를 찾을 수 없습니다.' })
    return
  }

  res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } })
}))

authRouter.post('/logout', asyncHandler(async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE]
  if (isNonEmptyString(token)) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  res.status(204).end()
}))

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    res.status(404).json({ error: '유저를 찾을 수 없습니다.' })
    return
  }

  res.json({ id: user.id, email: user.email, name: user.name })
}))
