import { Router } from 'express'
import type { Response } from 'express'
import type { DodoDiaryEntry, VideoPost } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildPublicUrl } from '../lib/storage.js'
import { computeMood, computeTodayBehavior, upsertDailyDiary } from '../lib/dodo.js'
import { AVATAR_PALETTE } from '../constants.js'
import {
  equipRoomItem,
  getDodoAppearance,
  toAppearanceResponse,
  unequipRoomItem,
  updateDodoBaseAppearance,
} from '../lib/dodoAppearance.js'
import type { EquipRoomItemResult } from '../lib/dodoAppearance.js'

export const dodoRouter = Router()
dodoRouter.use(requireAuth)

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function toDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

type DiaryWithVideo = DodoDiaryEntry & { representativeVideoPost: VideoPost }

function readInventoryId(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const inventoryId = (body as Record<string, unknown>).inventoryId
  return typeof inventoryId === 'string' ? inventoryId : undefined
}

// 본인 전용 라우트에서만 쓰는 응답 — 공용 toAppearanceResponse에 "온보딩을 끝냈는지"를 얹어서 반환한다.
function toSelfAppearanceResponse(appearance: { onboardedAt: Date | null } & Parameters<typeof toAppearanceResponse>[0]) {
  return { ...toAppearanceResponse(appearance), onboarded: appearance.onboardedAt !== null }
}

function respondEquipResult(res: Response, result: EquipRoomItemResult) {
  switch (result.status) {
    case 'not_owned':
      res.status(403).json({ error: '가지고 있지 않은 아이템이에요.' })
      return
    case 'not_equippable':
      res.status(400).json({ error: '장착할 수 없는 아이템이에요.' })
      return
    case 'ok':
      res.json(toSelfAppearanceResponse(result.appearance))
      return
  }
}

function toDiaryResponse(entry: DiaryWithVideo) {
  return {
    id: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    text: entry.text,
    mood: entry.mood,
    pointsEarned: entry.pointsEarned,
    representativeVideoUrl: buildPublicUrl(entry.representativeVideoPost.storageKey),
    createdAt: entry.createdAt.toISOString(),
  }
}

dodoRouter.get('/state', asyncHandler(async (req, res) => {
  const [mood, behavior] = await Promise.all([
    computeMood(req.userId!),
    computeTodayBehavior(req.userId!),
  ])

  await prisma.dodoState.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, mood },
    update: { mood },
  })

  res.json({ mood, behavior })
}))

dodoRouter.get('/diary', asyncHandler(async (req, res) => {
  const entries = await prisma.dodoDiaryEntry.findMany({
    where: { userId: req.userId },
    include: { representativeVideoPost: true },
    orderBy: { date: 'desc' },
  })

  res.json(entries.map(toDiaryResponse))
}))

dodoRouter.get('/diary/:date', asyncHandler(async (req, res) => {
  if (!DATE_PATTERN.test(req.params.date)) {
    res.status(400).json({ error: 'date는 YYYY-MM-DD 형식이어야 합니다.' })
    return
  }

  // 오늘 날짜는 조회할 때마다 다시 계산해 그 사이 도착한 반응·포인트까지 반영한다. 과거 날짜는 저장된 값을 그대로 읽는다.
  const entry = req.params.date === todayKey()
    ? await upsertDailyDiary(req.userId!, toDateOnly(req.params.date))
    : await prisma.dodoDiaryEntry.findUnique({
        where: { userId_date: { userId: req.userId!, date: toDateOnly(req.params.date) } },
        include: { representativeVideoPost: true },
      })

  if (!entry) {
    res.status(404).json({ error: '해당 날짜의 일기가 없습니다.' })
    return
  }

  res.json(toDiaryResponse(entry as DiaryWithVideo))
}))

dodoRouter.get('/appearance', asyncHandler(async (req, res) => {
  const appearance = await getDodoAppearance(req.userId!)
  res.json(toSelfAppearanceResponse(appearance))
}))

dodoRouter.patch('/appearance', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { bodyColor, eyeCount } = body as Record<string, unknown>
  if (typeof bodyColor !== 'string' || !(AVATAR_PALETTE as readonly string[]).includes(bodyColor)) {
    res.status(400).json({ error: `bodyColor는 ${AVATAR_PALETTE.join('/')} 중 하나여야 합니다.` })
    return
  }
  if (eyeCount !== 1 && eyeCount !== 2 && eyeCount !== 3) {
    res.status(400).json({ error: 'eyeCount는 1, 2 또는 3이어야 합니다.' })
    return
  }

  const appearance = await updateDodoBaseAppearance(req.userId!, { bodyColor, eyeCount })
  res.json(toSelfAppearanceResponse(appearance))
}))

dodoRouter.post('/equip', asyncHandler(async (req, res) => {
  const inventoryId = readInventoryId(req.body)
  if (!inventoryId) {
    res.status(400).json({ error: 'inventoryId가 필요합니다.' })
    return
  }

  respondEquipResult(res, await equipRoomItem(req.userId!, inventoryId))
}))

dodoRouter.post('/unequip', asyncHandler(async (req, res) => {
  const inventoryId = readInventoryId(req.body)
  if (!inventoryId) {
    res.status(400).json({ error: 'inventoryId가 필요합니다.' })
    return
  }

  respondEquipResult(res, await unequipRoomItem(req.userId!, inventoryId))
}))
