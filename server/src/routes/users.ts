import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AVATAR_PALETTE, HANDLE_PATTERN } from '../constants.js'
import { getPointsBalance } from '../lib/points.js'
import { computeCurrentStreak } from '../lib/stats.js'

export const usersRouter = Router()
usersRouter.use(requireAuth)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

async function computeStats(userId: string) {
  const [completedCount, friendCount, currentStreak, points] = await Promise.all([
    prisma.schedule.count({ where: { userId, completed: true } }),
    prisma.friendship.count({ where: { userId } }),
    computeCurrentStreak(userId),
    getPointsBalance(userId),
  ])

  return { completedCount, friendCount, currentStreak, points }
}

type UserRow = {
  id: string
  email: string
  name: string
  handle: string | null
  bio: string | null
  avatarColor: string | null
  avatarEyes: number | null
}

function toResponse(user: UserRow, stats: { completedCount: number; friendCount: number; currentStreak: number; points: number }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    bio: user.bio,
    avatarColor: user.avatarColor,
    avatarEyes: user.avatarEyes,
    stats,
  }
}

usersRouter.get('/me', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    res.status(404).json({ error: '유저를 찾을 수 없습니다.' })
    return
  }

  const stats = await computeStats(req.userId!)
  res.json(toResponse(user, stats))
}))

usersRouter.patch('/me', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { name, handle, bio, avatarColor, avatarEyes } = body as Record<string, unknown>
  const data: {
    name?: string
    handle?: string | null
    bio?: string | null
    avatarColor?: string | null
    avatarEyes?: number | null
  } = {}

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      res.status(400).json({ error: 'name은 빈 문자열일 수 없습니다.' })
      return
    }
    data.name = name.trim()
  }

  if (handle !== undefined) {
    if (handle === null) {
      data.handle = null
    } else if (typeof handle === 'string' && HANDLE_PATTERN.test(handle)) {
      data.handle = handle
    } else {
      res.status(400).json({ error: 'handle은 영문/숫자/언더스코어 3~20자여야 합니다.' })
      return
    }
  }

  if (bio !== undefined) {
    if (bio !== null && (typeof bio !== 'string' || bio.length > 120)) {
      res.status(400).json({ error: 'bio는 120자 이내 문자열이어야 합니다.' })
      return
    }
    data.bio = bio === null ? null : bio.trim()
  }

  if (avatarColor !== undefined) {
    if (avatarColor !== null && (typeof avatarColor !== 'string' || !(AVATAR_PALETTE as readonly string[]).includes(avatarColor))) {
      res.status(400).json({ error: `avatarColor는 ${AVATAR_PALETTE.join('/')} 중 하나여야 합니다.` })
      return
    }
    data.avatarColor = avatarColor
  }

  if (avatarEyes !== undefined) {
    if (avatarEyes !== null && avatarEyes !== 1 && avatarEyes !== 2 && avatarEyes !== 3) {
      res.status(400).json({ error: 'avatarEyes는 1, 2 또는 3이어야 합니다.' })
      return
    }
    data.avatarEyes = avatarEyes as number | null
  }

  if (data.handle) {
    const existing = await prisma.user.findUnique({ where: { handle: data.handle } })
    if (existing && existing.id !== req.userId) {
      res.status(409).json({ error: '이미 사용 중인 핸들입니다.' })
      return
    }
  }

  const updated = await prisma.user.update({ where: { id: req.userId }, data })
  const stats = await computeStats(req.userId!)
  res.json(toResponse(updated, stats))
}))
