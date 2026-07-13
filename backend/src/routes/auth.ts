import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  )

  return { accessToken, refreshToken }
}

// POST /api/auth/signup - 회원가입 (프로토타입: 실제 Supabase Auth 연동 필요)
router.post('/signup', async (req, res) => {
  try {
    const data = SignupSchema.parse(req.body)

    // 프로토타입: 실제로는 Supabase Auth에서 처리
    // const { data: authData, error: authError } = await supabase.auth.signUp({
    //   email: data.email,
    //   password: data.password,
    // })

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return res.status(409).json({ error: '이미 가입된 이메일입니다' })
    }

    // 프로토타입: UUID를 임시로 생성 (실제로는 Supabase UID 사용)
    const userId = `temp-user-${Date.now()}`

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: data.email,
      },
    })

    const tokens = generateTokens(user.id)

    res.status(201).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        ...tokens,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 요청입니다', details: error.errors })
    }
    console.error('회원가입 실패:', error)
    res.status(500).json({ error: '회원가입에 실패했습니다' })
  }
})

// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body)

    // 프로토타입: 실제로는 Supabase Auth 검증
    // const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    //   email: data.email,
    //   password: data.password,
    // })

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다' })
    }

    const tokens = generateTokens(user.id)

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        ...tokens,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 요청입니다', details: error.errors })
    }
    console.error('로그인 실패:', error)
    res.status(500).json({ error: '로그인에 실패했습니다' })
  }
})

// GET /api/auth/profile-status - 프로필 등록 여부 확인
router.get('/profile-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.json({ hasProfile: false, requiresAuth: true })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.decode(token) as Record<string, any>

    if (!decoded?.sub) {
      return res.json({ hasProfile: false, requiresAuth: true })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: decoded.sub },
    })

    res.json({
      hasProfile: !!profile,
      profileId: profile?.id,
    })
  } catch (error) {
    console.error('프로필 상태 확인 실패:', error)
    res.json({ hasProfile: false })
  }
})

export default router
