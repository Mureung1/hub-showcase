import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { verifyAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
}

interface CalendarEventPayload {
  title: string
  type: 'EXAM' | 'PART_TIME' | 'OTHER'
  dtstart: string
  dtend: string
}

// GET: 사용자의 모든 일정 조회
router.get('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { dtstart: 'asc' },
    })
    res.json({
      success: true,
      data: events,
    } as ApiResponse<typeof events>)
  } catch (error) {
    console.error('일정 조회 실패:', error)
    res.status(500).json({ error: '일정 조회 실패' })
  }
})

// GET: 특정 기간의 일정 (캘린더 뷰용)
router.get('/range', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate와 endDate 필수' })
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        dtstart: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      orderBy: { dtstart: 'asc' },
    })

    res.json({
      success: true,
      data: events,
    } as ApiResponse<typeof events>)
  } catch (error) {
    console.error('기간별 일정 조회 실패:', error)
    res.status(500).json({ error: '기간별 일정 조회 실패' })
  }
})

// POST: 새 일정 생성
router.post('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { title, type, dtstart, dtend } = req.body as CalendarEventPayload

    if (!title || !type || !dtstart || !dtend) {
      return res.status(400).json({ error: '필수 필드 누락' })
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        type,
        dtstart: new Date(dtstart),
        dtend: new Date(dtend),
        source: 'manual',
      },
    })

    res.status(201).json({
      success: true,
      data: event,
    } as ApiResponse<typeof event>)
  } catch (error) {
    console.error('일정 생성 실패:', error)
    res.status(500).json({ error: '일정 생성 실패' })
  }
})

// PATCH: 일정 수정
router.patch('/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const { title, type, dtstart, dtend } = req.body

    // 소유권 확인
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!event || event.userId !== userId) {
      return res.status(403).json({ error: '권한 없음' })
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(dtstart && { dtstart: new Date(dtstart) }),
        ...(dtend && { dtend: new Date(dtend) }),
      },
    })

    res.json({
      success: true,
      data: updated,
    } as ApiResponse<typeof updated>)
  } catch (error) {
    console.error('일정 수정 실패:', error)
    res.status(500).json({ error: '일정 수정 실패' })
  }
})

// DELETE: 일정 삭제
router.delete('/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // 소유권 확인
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!event || event.userId !== userId) {
      return res.status(403).json({ error: '권한 없음' })
    }

    await prisma.calendarEvent.delete({ where: { id } })

    res.json({
      success: true,
      data: { id },
    })
  } catch (error) {
    console.error('일정 삭제 실패:', error)
    res.status(500).json({ error: '일정 삭제 실패' })
  }
})

export default router
