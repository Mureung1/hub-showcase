import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { verifyAuth, AuthRequest } from '../middleware/auth.js'

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

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(6, '비밀번호 확인은 6자 이상이어야 합니다'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인이 일치하지 않습니다',
  path: ['confirmPassword'],
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

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: data.email,
        password: hashedPassword,
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

    // 비밀번호 검증 (저장된 비밀번호가 있는 경우)
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(data.password, user.password)
      if (!isPasswordValid) {
        return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다' })
      }
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

// PATCH /api/auth/password - 비밀번호 변경
router.patch('/password', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const data = ChangePasswordSchema.parse(req.body)

    // 현재 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
    }

    // 비밀번호가 설정되지 않은 경우 (예: OAuth만 사용)
    if (!user.password) {
      return res.status(400).json({ error: '비밀번호 기반 인증을 사용하지 않습니다' })
    }

    // 현재 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다' })
    }

    // 새 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(data.newPassword, 10)

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다',
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '유효하지 않은 데이터입니다', details: error.errors })
    }
    console.error('비밀번호 변경 실패:', error)
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다' })
  }
})

export default router
