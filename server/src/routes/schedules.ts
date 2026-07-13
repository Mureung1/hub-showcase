import { Router } from 'express'
import type { Schedule } from '@prisma/client'
import { prisma } from '../db.js'
import { DEMO_USER_ID } from '../constants.js'

export const schedulesRouter = Router()

type ScheduleWithCategory = Schedule & { category: { tone: string } }

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function toResponse(schedule: ScheduleWithCategory) {
  return {
    id: schedule.id,
    date: schedule.date.toISOString().slice(0, 10),
    title: schedule.title,
    time: schedule.time ?? '',
    category: schedule.categoryId,
    tone: schedule.category.tone,
    completed: schedule.completed,
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

schedulesRouter.get('/', async (_req, res) => {
  const schedules = await prisma.schedule.findMany({
    where: { userId: DEMO_USER_ID },
    include: { category: true },
    orderBy: { date: 'asc' },
  })

  res.json(schedules.map(toResponse))
})

schedulesRouter.post('/', async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { categoryId, date, title, time } = body as Record<string, unknown>

  if (!isNonEmptyString(categoryId) || !isNonEmptyString(date) || !isNonEmptyString(title)) {
    res.status(400).json({ error: 'categoryId, date, title은 필수입니다.' })
    return
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    res.status(404).json({ error: '존재하지 않는 카테고리입니다.' })
    return
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId: DEMO_USER_ID,
      categoryId,
      date: toDateOnly(date),
      title,
      time: isNonEmptyString(time) ? time : null,
    },
    include: { category: true },
  })

  res.status(201).json(toResponse(schedule))
})

schedulesRouter.patch('/:id', async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { title, time, completed } = body as Record<string, unknown>
  const data: { title?: string; time?: string | null; completed?: boolean } = {}

  if (title !== undefined) {
    if (!isNonEmptyString(title)) {
      res.status(400).json({ error: 'title은 빈 문자열일 수 없습니다.' })
      return
    }
    data.title = title
  }
  if (time !== undefined) {
    if (typeof time !== 'string') {
      res.status(400).json({ error: 'time은 문자열이어야 합니다.' })
      return
    }
    data.time = time === '' ? null : time
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      res.status(400).json({ error: 'completed는 boolean이어야 합니다.' })
      return
    }
    data.completed = completed
  }

  const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== DEMO_USER_ID) {
    res.status(404).json({ error: '존재하지 않는 일정입니다.' })
    return
  }

  const schedule = await prisma.schedule.update({
    where: { id: req.params.id },
    data,
    include: { category: true },
  })
  res.json(toResponse(schedule))
})

schedulesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== DEMO_USER_ID) {
    res.status(404).json({ error: '존재하지 않는 일정입니다.' })
    return
  }

  await prisma.schedule.delete({ where: { id: req.params.id } })
  res.status(204).end()
})
