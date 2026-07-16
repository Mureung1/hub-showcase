// 유휴 시간 분석 기반 스마트 추천 서비스
import { CalendarEvent, Posting } from '@prisma/client'

interface HighLoadPeriod {
  start: Date
  end: Date
  type: string
}

interface SmartMatchScore {
  score: number
  reason: string
  isRecommended: boolean
  conflictLevel: 'high' | 'medium' | 'low' | 'none'
}

/**
 * 사용자의 캘린더 이벤트에서 고부하 기간을 추출
 * 인접한 이벤트들을 병합하여 연속된 바쁜 기간을 식별
 */
export function getHighLoadPeriods(events: CalendarEvent[]): HighLoadPeriod[] {
  if (events.length === 0) return []

  const sorted = [...events]
    .filter(e => !e.hideFromRecommendation)
    .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime())

  const periods: HighLoadPeriod[] = []
  let currentStart = sorted[0].dtstart
  let currentEnd = sorted[0].dtend

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i]
    const gap = (event.dtstart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24)

    if (gap <= 3) {
      // 3일 이내면 병합
      currentEnd = new Date(Math.max(currentEnd.getTime(), event.dtend.getTime()))
    } else {
      // 새 기간 시작
      periods.push({
        start: currentStart,
        end: currentEnd,
        type: sorted[i - 1].type,
      })
      currentStart = event.dtstart
      currentEnd = event.dtend
    }
  }

  periods.push({
    start: currentStart,
    end: currentEnd,
    type: sorted[sorted.length - 1].type,
  })

  return periods
}

/**
 * 공고의 마감일이 고부하 기간과 어떤 관계인지 판단
 */
function getConflictLevel(
  receptionEndDate: Date | null,
  eventStartDate: Date | null,
  eventEndDate: Date | null,
  highLoadPeriods: HighLoadPeriod[]
): { level: 'high' | 'medium' | 'low' | 'none'; overlappingPeriod?: HighLoadPeriod } {
  if (!receptionEndDate) return { level: 'none' }

  // 공고 마감일이 고부하 기간과 겹치는지 확인
  for (const period of highLoadPeriods) {
    if (receptionEndDate >= period.start && receptionEndDate <= period.end) {
      return { level: 'high', overlappingPeriod: period }
    }
  }

  // 이벤트 수행기간이 있으면, 그것도 체크
  if (eventStartDate && eventEndDate) {
    for (const period of highLoadPeriods) {
      const eventStart = eventStartDate.getTime()
      const eventEnd = eventEndDate.getTime()
      const periodStart = period.start.getTime()
      const periodEnd = period.end.getTime()

      // 완전히 겹치는 경우
      if (eventStart <= periodEnd && eventEnd >= periodStart) {
        return { level: 'high', overlappingPeriod: period }
      }
    }
  }

  // 마감일이 고부하 기간 바로 다음주면 medium
  if (highLoadPeriods.length > 0) {
    const lastPeriod = highLoadPeriods[highLoadPeriods.length - 1]
    const daysAfter =
      (receptionEndDate.getTime() - lastPeriod.end.getTime()) / (1000 * 60 * 60 * 24)

    if (daysAfter > 0 && daysAfter <= 7) {
      return { level: 'low' }
    }
    if (daysAfter > 7 && daysAfter <= 21) {
      return { level: 'low' }
    }
  }

  return { level: 'none' }
}

/**
 * 스마트 매칭 스코어 계산
 * - 고부하 기간과의 관계를 바탕으로 추천점수 산출
 * - 마감일이 바쁜 기간 이후면 긍정적
 * - 바쁜 기간 중이면 부정적
 */
export function calculateSmartScore(
  posting: Posting & { calendarEvents?: CalendarEvent[] },
  userEvents: CalendarEvent[]
): SmartMatchScore {
  const highLoadPeriods = getHighLoadPeriods(userEvents)

  if (highLoadPeriods.length === 0) {
    // 바쁜 기간이 없으면 기본 점수
    return {
      score: 50,
      reason: '캘린더에 일정이 없어 모든 공고를 자유롭게 준비할 수 있어요',
      isRecommended: true,
      conflictLevel: 'none',
    }
  }

  const { level, overlappingPeriod } = getConflictLevel(
    posting.receptionEndDate,
    posting.eventStartDate,
    posting.eventEndDate,
    highLoadPeriods
  )

  const lastPeriod = highLoadPeriods[highLoadPeriods.length - 1]
  const daysBeforeDeadline =
    posting.receptionEndDate ?
      (posting.receptionEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    : 0

  if (level === 'high') {
    return {
      score: 20,
      reason: `바쁜 기간(${overlappingPeriod?.type})과 공고 마감일이 겹쳐요. 시간 관리가 필요합니다.`,
      isRecommended: false,
      conflictLevel: 'high',
    }
  }

  if (level === 'low') {
    const daysAfter =
      posting.receptionEndDate ?
        (posting.receptionEndDate.getTime() - lastPeriod.end.getTime()) / (1000 * 60 * 60 * 24)
      : 0

    if (daysAfter > 0 && daysAfter <= 7) {
      return {
        score: 85,
        reason: `바쁜 기간이 끝난 직후 마감입니다. 여유있게 준비할 수 있어요!`,
        isRecommended: true,
        conflictLevel: 'low',
      }
    }

    if (daysAfter > 7 && daysAfter <= 21) {
      return {
        score: 70,
        reason: `바쁜 기간 이후라 충분한 시간이 남아있습니다.`,
        isRecommended: true,
        conflictLevel: 'low',
      }
    }
  }

  // 바쁜 기간이 없거나 멀리 있는 경우
  if (daysBeforeDeadline > 30) {
    return {
      score: 60,
      reason: `마감까지 넉넉한 시간이 있습니다.`,
      isRecommended: true,
      conflictLevel: 'none',
    }
  }

  return {
    score: 50,
    reason: '준비 시간이 충분한지 캘린더를 확인해주세요.',
    isRecommended: true,
    conflictLevel: 'none',
  }
}

/**
 * 여러 공고의 스마트 스코어를 계산하고 정렬
 */
export function rankPostingsBySmartScore(
  postings: (Posting & { calendarEvents?: CalendarEvent[] })[],
  userEvents: CalendarEvent[]
): Array<(Posting & { calendarEvents?: CalendarEvent[] }) & { smartScore: SmartMatchScore }> {
  return postings
    .map(posting => ({
      ...posting,
      smartScore: calculateSmartScore(posting, userEvents),
    }))
    .sort((a, b) => {
      // 추천 여부 우선
      if (a.smartScore.isRecommended !== b.smartScore.isRecommended) {
        return a.smartScore.isRecommended ? -1 : 1
      }
      // 스코어 높은 순
      return b.smartScore.score - a.smartScore.score
    })
}
