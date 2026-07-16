import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { verifyAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// ISO 시간 문자열을 로컬 시간 기준 Date로 파싱
// "2026-07-15T09:00:00" → 2026년 7월 15일 09:00 (로컬 시간)
const parseLocalDateTime = (isoString: string): Date => {
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!match) throw new Error(`잘못된 날짜 형식: ${isoString}`)

  const [, year, month, day, hour, minute, second] = match.map(Number)
  return new Date(year, month - 1, day, hour, minute, second)
}

// 시간 기반 일정(isAllDay=false)의 날짜 유효성 검증
const validateEventDates = (dtstart: string, dtend: string, isAllDay: boolean): string | null => {
  if (isAllDay) return null

  const startDateMatch = dtstart.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const endDateMatch = dtend.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!startDateMatch || !endDateMatch) return '날짜 형식 오류'

  const startDate = startDateMatch.slice(1).join('-')
  const endDate = endDateMatch.slice(1).join('-')

  if (startDate !== endDate) {
    return '시간으로 일정을 지정할 때는 같은 날에만 만들 수 있습니다'
  }

  return null
}

interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
}

interface CalendarEventPayload {
  title: string
  type: 'EXAM' | 'PART_TIME' | 'POSTING' | 'OTHER'
  dtstart: string
  dtend: string
  isAllDay?: boolean
  startTime?: string
  endTime?: string
  memo?: string
  hideFromRecommendation?: boolean
  relatedPostingId?: string
}

// GET: 사용자의 모든 일정 조회
router.get('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { dtstart: 'asc' },
    })

    // FullCalendar 오염 방지: startTime/endTime 필드 제거 후 반환
    // (FullCalendar가 이 필드를 보면 recurring event로 잘못 해석함)
    const sanitizedEvents = events.map(event => {
      const { startTime, endTime, ...rest } = event
      return {
        ...rest,
        rawStartTime: startTime,
        rawEndTime: endTime,
      }
    })

    res.json({
      success: true,
      data: sanitizedEvents,
    } as ApiResponse<any>)
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

    // FullCalendar 오염 방지: startTime/endTime 필드 제거 후 반환
    const sanitizedEvents = events.map(event => {
      const { startTime, endTime, ...rest } = event
      return {
        ...rest,
        rawStartTime: startTime,
        rawEndTime: endTime,
      }
    })

    res.json({
      success: true,
      data: sanitizedEvents,
    } as ApiResponse<any>)
  } catch (error) {
    console.error('기간별 일정 조회 실패:', error)
    res.status(500).json({ error: '기간별 일정 조회 실패' })
  }
})

// POST: 새 일정 생성
router.post('/', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { title, type, dtstart, dtend, isAllDay, startTime, endTime, memo, hideFromRecommendation, relatedPostingId } = req.body as CalendarEventPayload

    if (!title || !type || !dtstart || !dtend) {
      return res.status(400).json({ error: '필수 필드 누락' })
    }

    // 시간 기반 일정 검증: 같은 날에만 생성 가능
    const dateValidationError = validateEventDates(dtstart, dtend, isAllDay ?? true)
    if (dateValidationError) {
      return res.status(400).json({ error: dateValidationError })
    }

    console.log('📥 일정 생성 요청:', {
      title,
      type,
      isAllDay,
      dtstart,
      dtend,
      startTime,
      endTime,
    })

    // 로컬 시간 기준으로 Date 파싱 (타임존 보정)
    const dtstartDate = parseLocalDateTime(dtstart)
    const dtendDate = parseLocalDateTime(dtend)

    console.log('🔄 Date 변환 후 (로컬 기준):', {
      dtstart: dtstartDate.toISOString(),
      dtend: dtendDate.toISOString(),
      dtstartLocal: dtstartDate.toString(),
      dtendLocal: dtendDate.toString(),
    })

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        type,
        dtstart: dtstartDate,
        dtend: dtendDate,
        isAllDay: isAllDay ?? true,
        startTime: startTime,
        endTime: endTime,
        memo: memo,
        hideFromRecommendation: hideFromRecommendation ?? false,
        relatedPostingId: relatedPostingId,
        source: 'manual',
      },
    })

    console.log('💾 DB 저장 완료:', {
      id: event.id,
      dtstart: event.dtstart.toISOString(),
      dtend: event.dtend.toISOString(),
      isAllDay: event.isAllDay,
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
    const { title, type, dtstart, dtend, isAllDay, startTime, endTime, memo, hideFromRecommendation } = req.body

    // 소유권 확인
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!event || event.userId !== userId) {
      return res.status(403).json({ error: '권한 없음' })
    }

    // 시간 기반 일정 검증: 같은 날에만 수정 가능
    if (dtstart && dtend) {
      const finalIsAllDay = isAllDay !== undefined ? isAllDay : event.isAllDay
      const dateValidationError = validateEventDates(dtstart, dtend, finalIsAllDay)
      if (dateValidationError) {
        return res.status(400).json({ error: dateValidationError })
      }
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(dtstart && { dtstart: parseLocalDateTime(dtstart) }),
        ...(dtend && { dtend: parseLocalDateTime(dtend) }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(memo !== undefined && { memo }),
        ...(hideFromRecommendation !== undefined && { hideFromRecommendation }),
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

// DELETE: 제목으로 일정 삭제 (관리자용)
router.delete('/by-title/:title', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { title } = req.params
    const decodedTitle = decodeURIComponent(title)

    console.log(`🗑️ 제목으로 일정 삭제 요청: "${decodedTitle}" (사용자: ${userId})`)

    // 현재 사용자의 해당 제목 일정 찾기
    const event = await prisma.calendarEvent.findFirst({
      where: {
        userId,
        title: decodedTitle,
      },
    })

    if (!event) {
      console.log(`❌ 해당 제목의 일정을 찾을 수 없음: "${decodedTitle}"`)
      return res.status(404).json({
        error: '해당 제목의 일정을 찾을 수 없습니다',
        searched: decodedTitle,
      })
    }

    console.log(`🗑️ 일정 삭제 중: ${event.id}`)
    await prisma.calendarEvent.delete({ where: { id: event.id } })

    res.json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        message: '일정이 삭제되었습니다',
      },
    })
  } catch (error) {
    console.error('제목으로 일정 삭제 실패:', error)
    res.status(500).json({ error: '일정 삭제 실패' })
  }
})

export default router
