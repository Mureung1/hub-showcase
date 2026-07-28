import { Router } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'
import { matchUserToPosting } from '../services/matchingService.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/postings - 필터링된 공고 목록
router.get('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const {
      limit = '20',
      offset = '0',
      category = 'all',
      smart = 'false',
    } = req.query as { limit?: string; offset?: string; category?: string; smart?: string }

    // 사용자 프로필 조회
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!userProfile) {
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다' })
    }

    // 조건식 구성
    const where: Prisma.PostingWhereInput = {}
    if (category !== 'all') {
      where.category = category as any
    }

    // 공고 조회 (eligibility, scraps 포함)
    const postings = await prisma.posting.findMany({
      where,
      include: {
        eligibility: true,
        scraps: {
          where: { userId },
        },
      },
      orderBy: { receptionEndDate: 'asc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    })

    // 총 공고 수
    const total = await prisma.posting.count({ where })

    // 응답 데이터 포맷
    const result = postings
      .filter(posting => posting.eligibility)
      .map(posting => {
        const eligibility = posting.eligibility!
        const match = matchUserToPosting(userProfile, eligibility)
        const isScraped = posting.scraps.length > 0

        // D-Day 계산
        const dDay = posting.receptionEndDate
          ? Math.ceil(
              (new Date(posting.receptionEndDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null

        return {
          id: posting.id,
          title: posting.title,
          category: posting.category,
          hostOrg: posting.hostOrg,
          receptionStartDate: posting.receptionStartDate,
          receptionEndDate: posting.receptionEndDate,
          eventStartDate: posting.eventStartDate,
          eventEndDate: posting.eventEndDate,
          sourceUrl: posting.sourceUrl,
          parseStatus: posting.parseStatus,
          isScraped,
          isEligible: match.isEligible,
          matchScore: Math.round(match.score),
          dDay,
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

    res.json({
      success: true,
      data: {
        postings: result,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + result.length < total,
        },
      },
    })
  } catch (error) {
    console.error('공고 목록 조회 실패:', error)
    res.status(500).json({ error: '공고 목록 조회에 실패했습니다' })
  }
})

// POST /api/postings/:id/scrap - 스크랩 토글
router.post('/:id/scrap', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { id: postingId } = req.params

    const existingScrap = await prisma.scrap.findUnique({
      where: {
        userId_postingId: {
          userId,
          postingId,
        },
      },
    })

    if (existingScrap) {
      await prisma.scrap.delete({
        where: { id: existingScrap.id },
      })
      return res.json({ success: true, isScraped: false })
    }

    await prisma.scrap.create({
      data: {
        userId,
        postingId,
      },
    })

    res.json({ success: true, isScraped: true })
  } catch (error) {
    console.error('스크랩 토글 실패:', error)
    res.status(500).json({ error: '스크랩 처리에 실패했습니다' })
  }
})

// GET /api/postings/:id - 공고 상세 조회
router.get('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { id } = req.params

    const posting = await prisma.posting.findUnique({
      where: { id },
      include: {
        eligibility: true,
        scraps: {
          where: { userId },
        },
      },
    })

    if (!posting || !posting.eligibility) {
      return res.status(404).json({ error: '공고를 찾을 수 없습니다' })
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    const match = userProfile
      ? matchUserToPosting(userProfile, posting.eligibility)
      : { isEligible: true, score: 100 }

    const isScraped = posting.scraps.length > 0

    res.json({
      success: true,
      data: {
        ...posting,
        isScraped,
        isEligible: match.isEligible,
        matchScore: Math.round(match.score),
      },
    })
  } catch (error) {
    console.error('공고 상세 조회 실패:', error)
    res.status(500).json({ error: '공고 조회에 실패했습니다' })
  }
})

export default router