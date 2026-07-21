import { Router } from 'express'
import type { DodoDiaryEntry, VideoPost } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildPublicUrl } from '../lib/storage.js'
import { computeMood, computeTodayBehavior, upsertDailyDiary } from '../lib/dodo.js'

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
