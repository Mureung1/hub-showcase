import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prismaClient.js'
import { validateSchoolEmail } from '../utils/validateSchoolEmail.js'
import { env } from '../config/env.js'

const SALT_ROUNDS = 10
const JWT_EXPIRES_IN = '7d'

// 아이디 중복확인: username이 이미 존재하는지 확인해서 available true/false 반환
export async function checkUsername(req, res) {
  try {
    const { username } = req.body

    if (!username) {
      return res.status(400).json({ message: '아이디를 입력해주세요.' })
    }

    const existingUser = await prisma.user.findUnique({ where: { username } })

    return res.json({ available: !existingUser })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}

// 회원가입: 입력값 검증 후 비밀번호를 해시화해서 users 테이블에 저장
export async function signup(req, res) {
  try {
    const { username, password, passwordConfirm, name, age, gender, nickname, schoolEmail } = req.body

    // 1. 필수값 누락 확인
    if (!username || !password || !passwordConfirm || !name || !age || !gender || !nickname || !schoolEmail) {
      return res.status(400).json({ message: '모든 항목을 입력해주세요.' })
    }

    // 2. 비밀번호 확인 일치 여부
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' })
    }

    // 3. 학교 이메일(.ac.kr) 형식 확인
    if (!validateSchoolEmail(schoolEmail)) {
      return res.status(400).json({ message: '학교 이메일(.ac.kr) 형식이 아닙니다.' })
    }

    // 4. 아이디 중복 확인
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' })
    }

    // 4-1. 나이 유효성 검증 (19~80세)
    const ageNumber = Number(age)
    if (Number.isNaN(ageNumber) || ageNumber < 19 || ageNumber > 80) {
      return res.status(400).json({ message: '나이는 19세에서 80세 사이로 입력해주세요' })
    }

    // 5. 비밀번호 해시화
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // 학교 이메일 도메인 앞부분을 학교 이름으로 임시 사용 (예: student@hanyang.ac.kr -> hanyang)
    const schoolName = schoolEmail.split('@')[1]?.split('.ac.kr')[0] ?? ''

    // 나이를 바탕으로 출생연도 대략 계산
    const birthYear = new Date().getFullYear() - ageNumber

    // 6. DB에 사용자 저장 (is_verified는 우선 false)
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        nickname,
        name,
        gender,
        birthYear,
        schoolName,
        schoolEmail,
        isVerified: false,
      },
    })

    // 7. 성공 응답 (password_hash는 절대 포함하지 않음)
    return res.status(201).json({
      userId: user.userId.toString(),
      username: user.username,
      nickname: user.nickname,
    })
  } catch (err) {
    // username/schoolEmail unique 제약 위반 (동시 요청 등으로 인한 경합 상황 대비)
    if (err.code === 'P2002') {
      return res.status(409).json({ message: '이미 사용 중인 아이디 또는 학교 이메일입니다.' })
    }
    console.error(err)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}

// 로그인: username/password 확인 후 JWT 토큰 발급
export async function login(req, res) {
  try {
    const { username, password } = req.body

    // 1. 필수값 누락 확인
    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' })
    }

    // 2. username으로 사용자 조회
    const user = await prisma.user.findUnique({ where: { username } })

    // 아이디가 틀렸는지 비밀번호가 틀렸는지 구분해서 알려주지 않는다 (계정 존재 여부 노출 방지)
    const invalidMessage = '아이디 또는 비밀번호가 올바르지 않습니다.'
    if (!user) {
      return res.status(401).json({ message: invalidMessage })
    }

    // 3. 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({ message: invalidMessage })
    }

    // 4. JWT 토큰 발급 (payload에는 최소한의 식별 정보만 포함)
    const token = jwt.sign(
      { userId: user.userId.toString(), username: user.username },
      env.jwtSecret,
      { expiresIn: JWT_EXPIRES_IN },
    )

    // 5. 취미 테스트 완료 여부 확인 (hobby_test_results에 row가 있는지)
    const hobbyTestResult = await prisma.hobbyTestResult.findUnique({ where: { userId: user.userId } })

    // 6. 성공 응답 (password_hash는 절대 포함하지 않음)
    return res.status(200).json({
      token,
      userId: user.userId.toString(),
      username: user.username,
      nickname: user.nickname,
      hasCompletedHobbyTest: Boolean(hobbyTestResult),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
}
