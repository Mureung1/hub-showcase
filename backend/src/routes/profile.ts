import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { CreateUserProfileSchema, UpdateUserProfileSchema } from '../../../shared/src/schemas/profile.js'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/profile - 현재 유저의 프로필 조회
router.get('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다' })
    }

    // User의 nickname과 UserProfile 함께 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      return res.status(404).json({ error: '프로필을 찾을 수 없습니다' })
    }

    // nickname을 프로필에 포함해서 반환
    res.json({
      ...profile,
      nickname: user?.nickname || null,
    })
  } catch (error) {
    console.error('프로필 조회 실패:', error)
    res.status(500).json({ error: '프로필 조회에 실패했습니다' })
  }
})

// POST /api/profile - 프로필 생성
router.post('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const data = CreateUserProfileSchema.parse(req.body)

    // 기존 프로필 확인
    const existing = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (existing) {
      return res.status(400).json({ error: '이미 프로필이 존재합니다' })
    }

    const profile = await prisma.userProfile.create({
      data: {
        userId,
        major: data.major || null,
        grade: data.grade || null,
        enrollmentStatus: data.enrollmentStatus || null,
        residenceRegion: data.residenceRegion || null,
        incomeBracket: data.incomeBracket || null,
        age: data.age || null,
        interestTags: data.interestTags || [],
      },
    })

    res.status(201).json(profile)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 데이터입니다', details: error.errors })
    }
    console.error('프로필 생성 실패:', error)
    res.status(500).json({ error: '프로필 생성에 실패했습니다' })
  }
})

// PATCH /api/profile - 프로필 수정
router.patch('/', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const data = UpdateUserProfileSchema.parse(req.body)

    // User 테이블 닉네임 업데이트 (있으면)
    if (data.nickname !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { nickname: data.nickname },
      })
    }

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        major: data.major !== undefined ? data.major : undefined,
        grade: data.grade !== undefined ? data.grade : undefined,
        enrollmentStatus: data.enrollmentStatus !== undefined ? data.enrollmentStatus : undefined,
        residenceRegion: data.residenceRegion !== undefined ? data.residenceRegion : undefined,
        incomeBracket: data.incomeBracket !== undefined ? data.incomeBracket : undefined,
        age: data.age !== undefined ? data.age : undefined,
        interestTags: data.interestTags !== undefined ? data.interestTags : undefined,
      },
    })

    res.json(profile)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 데이터입니다', details: error.errors })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '프로필을 찾을 수 없습니다' })
    }
    console.error('프로필 수정 실패:', error)
    res.status(500).json({ error: '프로필 수정에 실패했습니다' })
  }
})

export default router
