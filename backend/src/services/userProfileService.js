import { prisma } from '../config/prismaClient.js'

// userId로 닉네임 + 소프트필터(손님방문정책, 온도선호) 조회
// select만 사용해 email/passwordHash 등 민감 정보는 애초에 조회하지 않는다
export async function getUserProfileById(userId) {
  const targetId = BigInt(userId)

  const user = await prisma.user.findUnique({
    where: { userId: targetId },
    select: {
      nickname: true,
      personalityTests: {
        where: { testType: 'lifestyle' },
        select: { scoreSummary: true },
      },
    },
  })

  if (!user) {
    const err = new Error('존재하지 않는 유저입니다.')
    err.status = 404
    throw err
  }

  const lifestyleTest = user.personalityTests[0]

  if (!lifestyleTest) {
    const err = new Error('해당 유저의 생활성향 테스트 결과가 없습니다.')
    err.status = 404
    throw err
  }

  const { filters } = lifestyleTest.scoreSummary

  return {
    nickname: user.nickname,
    softFilters: {
      guestPolicy: filters.guestPolicy,
      temperaturePreference: filters.temperaturePreference,
    },
  }
}
