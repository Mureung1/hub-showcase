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

// GET: ICS 내보내기
router.get('/export.ics', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { dtstart: 'asc' },
    })

    // ICS 포맷 생성 (Google Calendar 호환)
    let ics = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//UniBoard//UniBoard Calendar//EN\r
CALSCALE:GREGORIAN\r
METHOD:PUBLISH\r
X-WR-CALNAME:UniBoard 일정\r
X-WR-TIMEZONE:Asia/Seoul\r
BEGIN:VTIMEZONE\r
TZID:Asia/Seoul\r
BEGIN:STANDARD\r
DTSTART:19700101T000000\r
TZOFFSETFROM:+0900\r
TZOFFSETTO:+0900\r
TZNAME:KST\r
END:STANDARD\r
END:VTIMEZONE\r
`

    events.forEach(event => {
      const uid = `${event.id}@uniboard.local`
      const now = new Date()
      const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z'

      // 날짜 포맷 (YYYYMMDD)
      const dtstart = event.dtstart.toISOString().split('T')[0].replace(/-/g, '')
      // All-day 이벤트는 종료일을 다음날로 설정해야 함
      const dtend = new Date(event.dtend.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
        .replace(/-/g, '')

      const summary = event.title
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')

      const description = event.memo
        ? event.memo
            .replace(/\\/g, '\\\\')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;')
            .replace(/\n/g, '\\n')
        : ''

      ics += `BEGIN:VEVENT\r
UID:${uid}\r
DTSTAMP:${dtstamp}\r
DTSTART;VALUE=DATE:${dtstart}\r
DTEND;VALUE=DATE:${dtend}\r
SUMMARY:${summary}\r
${description ? `DESCRIPTION:${description}\r` : ''}TRANSP:TRANSPARENT\r
STATUS:CONFIRMED\r
SEQUENCE:0\r
END:VEVENT\r
`
    })

    ics += `END:VCALENDAR\r\n`

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="uniboard-calendar.ics"')
    res.send(ics)
  } catch (error) {
    console.error('ICS 내보내기 실패:', error)
    res.status(500).json({ error: 'ICS 내보내기 실패' })
  }
})

// POST: ICS 가져오기
router.post('/import.ics', verifyAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { icsContent } = req.body

    if (!icsContent) {
      return res.status(400).json({ error: 'ICS 내용이 필요합니다' })
    }

    // ICS 파싱
    const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g
    const events = []
    let match

    while ((match = eventRegex.exec(icsContent)) !== null) {
      const eventBlock = match[1]

      // 필드 추출 (줄바꿈 처리)
      const summaryMatch = eventBlock.match(/SUMMARY:(.+?)(?:\r?\n|$)/)
      const dtStartMatch = eventBlock.match(/DTSTART(?:;VALUE=DATE)?(?:;[^:]*)?:(\d{8}T?\d{0,6}Z?|[\dT\-Z:]+)/)
      const dtEndMatch = eventBlock.match(/DTEND(?:;VALUE=DATE)?(?:;[^:]*)?:(\d{8}T?\d{0,6}Z?|[\dT\-Z:]+)/)
      const descMatch = eventBlock.match(/DESCRIPTION:(.+?)(?:\r?\n|$)/)
      const categoriesMatch = eventBlock.match(/CATEGORIES:(.+?)(?:\r?\n|$)/)

      if (dtStartMatch) {
        // 제목 언이스케이프 (SUMMARY가 없으면 기본값)
        const title = summaryMatch
          ? summaryMatch[1]
              .trim()
              .replace(/\\n/g, '\n')
              .replace(/\\;/g, ';')
              .replace(/\\,/g, ',')
              .replace(/\\\\/g, '\\')
          : '(제목 없음)'

        const typeStr = categoriesMatch?.[1]?.trim()?.toUpperCase()
        const type = ['EXAM', 'PART_TIME', 'POSTING', 'OTHER'].includes(typeStr)
          ? typeStr
          : 'OTHER'

        // 날짜 파싱
        const dtStartStr = dtStartMatch[1].trim()
        let dtstart: Date

        if (dtStartStr.length === 8) {
          // VALUE=DATE 형식 (YYYYMMDD)
          const year = parseInt(dtStartStr.substring(0, 4))
          const month = parseInt(dtStartStr.substring(4, 6)) - 1
          const day = parseInt(dtStartStr.substring(6, 8))
          dtstart = new Date(year, month, day)
        } else if (dtStartStr.match(/^\d{8}T\d{6}Z?$/)) {
          // Google DateTime 형식 (YYYYMMDDTHHMMSSZ)
          const year = parseInt(dtStartStr.substring(0, 4))
          const month = parseInt(dtStartStr.substring(4, 6)) - 1
          const day = parseInt(dtStartStr.substring(6, 8))
          const hour = parseInt(dtStartStr.substring(9, 11))
          const minute = parseInt(dtStartStr.substring(11, 13))
          const second = parseInt(dtStartStr.substring(13, 15))

          if (dtStartStr.endsWith('Z')) {
            // UTC 시간을 로컬 시간으로 변환
            dtstart = new Date(Date.UTC(year, month, day, hour, minute, second))
          } else {
            dtstart = new Date(year, month, day, hour, minute, second)
          }
        } else if (dtStartStr.includes('T')) {
          // DateTime 형식 (ISO)
          dtstart = new Date(dtStartStr.replace('Z', '+00:00'))
        } else {
          // ISO 형식
          dtstart = new Date(dtStartStr)
        }

        // 종료일 파싱
        let dtend = new Date(dtstart)
        if (dtEndMatch) {
          const dtEndStr = dtEndMatch[1].trim()
          if (dtEndStr.length === 8) {
            const year = parseInt(dtEndStr.substring(0, 4))
            const month = parseInt(dtEndStr.substring(4, 6)) - 1
            const day = parseInt(dtEndStr.substring(6, 8))
            // All-day 이벤트의 경우 DTEND는 이미 다음날이므로 하루를 뺌
            dtend = new Date(year, month, day - 1)
          } else if (dtEndStr.match(/^\d{8}T\d{6}Z?$/)) {
            // Google DateTime 형식
            const year = parseInt(dtEndStr.substring(0, 4))
            const month = parseInt(dtEndStr.substring(4, 6)) - 1
            const day = parseInt(dtEndStr.substring(6, 8))
            const hour = parseInt(dtEndStr.substring(9, 11))
            const minute = parseInt(dtEndStr.substring(11, 13))
            const second = parseInt(dtEndStr.substring(13, 15))

            if (dtEndStr.endsWith('Z')) {
              dtend = new Date(Date.UTC(year, month, day, hour, minute, second))
            } else {
              dtend = new Date(year, month, day, hour, minute, second)
            }
          } else if (dtEndStr.includes('T')) {
            dtend = new Date(dtEndStr.replace('Z', '+00:00'))
          } else {
            dtend = new Date(dtEndStr)
          }
        }

        // 설명 언이스케이프
        const memo = descMatch?.[1]
          ?.trim()
          .replace(/\\n/g, '\n')
          .replace(/\\;/g, ';')
          .replace(/\\,/g, ',')
          .replace(/\\\\/g, '\\') || ''

        events.push({
          title,
          type,
          dtstart,
          dtend,
          memo,
          isAllDay: false, // Google Calendar 이벤트는 시간을 가짐
          source: 'manual' as const,
        })

        console.log('📝 ICS 이벤트 파싱:', { title, type, dtstart, dtend })
      }
    }

    console.log(`📥 총 ${events.length}개 이벤트 파싱 완료`)

    if (events.length === 0) {
      return res.status(400).json({
        error: 'ICS 파일에서 이벤트를 찾을 수 없습니다',
        details: 'VEVENT 블록이 없거나 필수 필드(SUMMARY, DTSTART)가 없습니다',
      })
    }

    // 일정 저장
    const created = await prisma.calendarEvent.createMany({
      data: events.map(evt => ({
        ...evt,
        userId,
        hideFromRecommendation: false,
      })),
      skipDuplicates: true,
    })

    console.log(`✅ ${created.count}개 일정 저장 완료`)

    res.json({
      success: true,
      message: `${created.count}개 일정을 가져왔습니다`,
      count: created.count,
    })
  } catch (error) {
    console.error('❌ ICS 가져오기 실패:', error instanceof Error ? error.message : error)
    res.status(400).json({
      error: 'ICS 가져오기 실패',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
