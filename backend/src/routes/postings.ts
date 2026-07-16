import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { matchUserToPosting } from '../services/matchingService.js'
import { calculateSmartScore, rankPostingsBySmartScore } from '../services/smartMatchingService.js'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'
import { CalendarService } from '../services/calendarService.js'
import { GoogleCalendarProvider } from '../services/providers/googleCalendarProvider.js'

const router = Router()
const prisma = new PrismaClient()
const googleCalendarProvider = new GoogleCalendarProvider()
const calendarService = new CalendarService(googleCalendarProvider)

// GET /api/postings - 필터링된 공고 목록 조회
router.get('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { limit = '20', offset = '0', category, smart, sortBy = 'deadline' } = req.query

    // 사용자 프로필 조회
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!userProfile) {
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다' })
    }

    // 기본 쿼리: 마감되지 않은 공고만 조회
    const now = new Date()
    const whereClause: any = {
      receptionEndDate: {
        gt: now,  // 현재 시간보다 뒤인 공고만
      },
    }
    if (category && category !== 'all') {
      whereClause.category = category
    }

    // 스마트 정렬 사용 시 캘린더 이벤트 포함
    const useSmartMatching = smart === 'true'

    // 총 공고 수
    const total = await prisma.posting.count({ where: whereClause })

    // matchScore 정렬 시 모든 데이터 조회 (메모리에서 정렬 후 pagination)
    const shouldFetchAll = sortBy === 'matchScore'
    const orderByClause = sortBy === 'matchScore' ? undefined : { receptionEndDate: 'asc' }

    // 공고 목록 조회 (자격요건 포함)
    const postings = await prisma.posting.findMany({
      where: whereClause,
      include: {
        eligibility: true,
        scraps: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: orderByClause,
      ...(shouldFetchAll ? {} : { take: parseInt(limit as string), skip: parseInt(offset as string) }),
    })

    // 스마트 정렬용 사용자 캘린더 이벤트 조회
    let userCalendarEvents: any[] = []
    if (useSmartMatching) {
      userCalendarEvents = await prisma.calendarEvent.findMany({
        where: { userId },
      })
    }

    // 매칭 스코어 계산
    let result = postings
      .filter(posting => posting.eligibility)
      .map(posting => {
        const eligibility = posting.eligibility!
        const match = matchUserToPosting(userProfile, eligibility)
        const smartScore = useSmartMatching
          ? calculateSmartScore({
              ...posting,
              category: posting.category,
              receptionEndDate: posting.receptionEndDate,
              eventStartDate: posting.eventStartDate,
              eventEndDate: posting.eventEndDate,
            }, userCalendarEvents)
          : null

        return {
          id: posting.id,
          title: posting.title,
          category: posting.category,
          receptionStartDate: posting.receptionStartDate,
          receptionEndDate: posting.receptionEndDate,
          eventStartDate: posting.eventStartDate,
          eventEndDate: posting.eventEndDate,
          sourceUrl: posting.sourceUrl,
          parseStatus: posting.parseStatus,
          isScraped: posting.scraps.length > 0,
          isEligible: match.isEligible,
          matchScore: Math.round(match.score),
          smartScore: smartScore ? {
            score: smartScore.score,
            reason: smartScore.reason,
            isRecommended: smartScore.isRecommended,
            conflictLevel: smartScore.conflictLevel,
          } : undefined,
          eligibility: {
            majors: eligibility.majors,
            regions: eligibility.regions,
            grades: eligibility.grades,
            enrollmentStatuses: eligibility.enrollmentStatuses,
            ageMin: eligibility.ageMin,
            ageMax: eligibility.ageMax,
            incomeMax: eligibility.incomeMax,
          },
        }
      })

    // 정렬 적용
    if (sortBy === 'matchScore') {
      // 매칭도 점수 높은 순 (내림차순)
      result.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

      // matchScore 정렬 시 메모리에서 정렬 후 pagination 적용
      const limitNum = parseInt(limit as string)
      const offsetNum = parseInt(offset as string)
      result = result.slice(offsetNum, offsetNum + limitNum)
    }

    res.json({
      success: true,
      data: {
        postings: result,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + result.length < total,
        },
      },
    })
  } catch (error) {
    console.error('공고 조회 실패:', error)
    res.status(500).json({ error: '공고 조회에 실패했습니다' })
  }
})

// GET /api/postings/:id - 공고 상세 조회
router.get('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.userId!

    const posting = await prisma.posting.findUnique({
      where: { id },
      include: {
        eligibility: true,
        scraps: {
          where: { userId },
          select: { id: true, notifyEnabled: true },
        },
      },
    })

    if (!posting) {
      return res.status(404).json({ error: '공고를 찾을 수 없습니다' })
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    let matchResult = { isEligible: false, score: 0 }
    if (userProfile && posting.eligibility) {
      matchResult = matchUserToPosting(userProfile, posting.eligibility)
    }

    res.json({
      success: true,
      data: {
        ...posting,
        isEligible: matchResult.isEligible,
        matchScore: Math.round(matchResult.score),
        isScrapped: posting.scraps.length > 0,
        scrappedNotify: posting.scraps[0]?.notifyEnabled ?? false,
      },
    })
  } catch (error) {
    console.error('공고 상세 조회 실패:', error)
    res.status(500).json({ error: '공고 조회에 실패했습니다' })
  }
})

// POST /api/postings/:id/scrap - 공고 스크랩
router.post('/:id/scrap', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.userId!

    // 공고 존재 확인
    const posting = await prisma.posting.findUnique({ where: { id } })
    if (!posting) {
      return res.status(404).json({ error: '공고를 찾을 수 없습니다' })
    }

    // 이미 스크랩했으면 삭제
    const existing = await prisma.scrap.findUnique({
      where: {
        userId_postingId: { userId, postingId: id },
      },
    })

    if (existing) {
      // Google Calendar에서 이벤트 삭제
      if (existing.googleEventId) {
        try {
          await calendarService.unsync(userId, existing.googleEventId)
        } catch (error) {
          console.error('Google Calendar 이벤트 삭제 실패:', error)
        }
      }

      await prisma.scrap.delete({
        where: {
          userId_postingId: { userId, postingId: id },
        },
      })
      return res.json({ success: true, data: { isScrapped: false } })
    }

    // 새로 스크랩 추가
    const scrap = await prisma.scrap.create({
      data: {
        userId,
        postingId: id,
        notifyEnabled: true,
      },
    })

    // Google Calendar 동기화 (연동된 경우만)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true }
    })

    if (user?.googleAccessToken) {
      try {
        const result = await calendarService.sync(userId, posting)
        await prisma.scrap.update({
          where: { id: scrap.id },
          data: { googleEventId: result.eventId }
        })
      } catch (error) {
        console.error('Google Calendar 동기화 실패:', error)
      }
    }

    res.json({ success: true, data: { isScrapped: true } })
  } catch (error) {
    console.error('스크랩 실패:', error)
    res.status(500).json({ error: '스크랩에 실패했습니다' })
  }
})

export default router
