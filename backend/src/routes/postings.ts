import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { matchUserToPosting } from '../services/matchingService.js'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/postings - 필터링된 공고 목록 조회
router.get('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { limit = '20', offset = '0', category } = req.query

    // 사용자 프로필 조회
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!userProfile) {
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다' })
    }

    // 기본 쿼리
    const whereClause: any = {}
    if (category && category !== 'all') {
      whereClause.category = category
    }

    // 총 공고 수
    const total = await prisma.posting.count({ where: whereClause })

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
      orderBy: { receptionEndDate: 'asc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    })

    // 매칭 스코어 계산
    const result = postings.map(posting => {
      const match = matchUserToPosting(userProfile, posting.eligibility)

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
        eligibility: {
          majors: posting.eligibility.majors,
          regions: posting.eligibility.regions,
          grades: posting.eligibility.grades,
          enrollmentStatuses: posting.eligibility.enrollmentStatuses,
          ageMin: posting.eligibility.ageMin,
          ageMax: posting.eligibility.ageMax,
          incomeMax: posting.eligibility.incomeMax,
        },
      }
    })

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

    const match = userProfile
      ? matchUserToPosting(userProfile, posting.eligibility)
      : { isEligible: false, matchScore: 0 }

    res.json({
      success: true,
      data: {
        ...posting,
        isEligible: match.isEligible,
        matchScore: Math.round(match.score),
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
      await prisma.scrap.delete({
        where: {
          userId_postingId: { userId, postingId: id },
        },
      })
      return res.json({ success: true, data: { isScrapped: false } })
    }

    // 새로 스크랩 추가
    await prisma.scrap.create({
      data: {
        userId,
        postingId: id,
        notifyEnabled: true,
      },
    })

    res.json({ success: true, data: { isScrapped: true } })
  } catch (error) {
    console.error('스크랩 실패:', error)
    res.status(500).json({ error: '스크랩에 실패했습니다' })
  }
})

export default router
