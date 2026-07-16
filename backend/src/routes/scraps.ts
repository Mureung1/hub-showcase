import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'
import { matchUserToPosting } from '../services/matchingService.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/scraps - 사용자의 스크랩한 공고 목록
router.get('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { limit = '20', offset = '0', sortBy = 'dday' } = req.query

    // 사용자 프로필 조회
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!userProfile) {
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다' })
    }

    // 사용자가 스크랩한 공고들 조회
    const scraps = await prisma.scrap.findMany({
      where: { userId },
      include: {
        posting: {
          include: {
            eligibility: true,
          },
        },
      },
      orderBy:
        sortBy === 'date'
          ? { scrappedAt: 'desc' }
          : { posting: { receptionEndDate: 'asc' } }, // 기본: D-Day 순
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    })

    // 총 스크랩 수
    const total = await prisma.scrap.count({ where: { userId } })

    // 응답 데이터 포맷
    const result = scraps
      .filter(scrap => scrap.posting?.eligibility)
      .map(scrap => {
        const posting = scrap.posting!
        const eligibility = posting.eligibility!
        const match = matchUserToPosting(userProfile, eligibility)

        // D-Day 계산
        const dDay = Math.ceil(
          (new Date(posting.receptionEndDate!).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )

        return {
          scrapId: scrap.id,
          id: posting.id,
          title: posting.title,
          category: posting.category,
          receptionStartDate: posting.receptionStartDate,
          receptionEndDate: posting.receptionEndDate,
          eventStartDate: posting.eventStartDate,
          eventEndDate: posting.eventEndDate,
          sourceUrl: posting.sourceUrl,
          parseStatus: posting.parseStatus,
          isScraped: true,
          isEligible: match.isEligible,
          matchScore: Math.round(match.score),
          dDay,
          notifyEnabled: scrap.notifyEnabled,
          scrappedAt: scrap.scrappedAt,
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
        scraps: result,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + result.length < total,
        },
      },
    })
  } catch (error) {
    console.error('스크랩 목록 조회 실패:', error)
    res.status(500).json({ error: '스크랩 목록 조회에 실패했습니다' })
  }
})

// PATCH /api/scraps/:id - 알림 설정 변경
router.patch('/:id', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { id } = req.params
    const { notifyEnabled } = req.body

    // 소유권 확인
    const scrap = await prisma.scrap.findUnique({ where: { id } })
    if (!scrap || scrap.userId !== userId) {
      return res.status(403).json({ error: '권한 없음' })
    }

    // 알림 설정 업데이트
    const updated = await prisma.scrap.update({
      where: { id },
      data: { notifyEnabled: notifyEnabled ?? !scrap.notifyEnabled },
      include: {
        posting: true,
      },
    })

    res.json({
      success: true,
      data: {
        id: updated.id,
        postingId: updated.postingId,
        notifyEnabled: updated.notifyEnabled,
      },
    })
  } catch (error) {
    console.error('알림 설정 변경 실패:', error)
    res.status(500).json({ error: '알림 설정 변경에 실패했습니다' })
  }
})

export default router
