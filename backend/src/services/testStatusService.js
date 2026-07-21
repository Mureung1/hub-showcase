import { prisma } from '../config/prismaClient.js'

// userId로 취미/생활성향/이상형(연애) 테스트 완료 여부를 조회
// 완료 여부를 별도 컬럼에 저장하지 않고, 매 요청마다 해당 테이블에 행이 있는지로 판단한다
export async function getTestStatusByUserId(userId) {
  const targetId = BigInt(userId)

  const [hobbyTestResult, lifestyleTest, datingTest] = await Promise.all([
    prisma.hobbyTestResult.findUnique({ where: { userId: targetId } }),
    prisma.personalityTest.findFirst({ where: { userId: targetId, testType: 'lifestyle' } }),
    prisma.personalityTest.findFirst({ where: { userId: targetId, testType: 'dating' } }),
  ])

  return {
    hasCompletedHobbyTest: Boolean(hobbyTestResult),
    hasCompletedLifestyleTest: Boolean(lifestyleTest),
    hasCompletedDatingTest: Boolean(datingTest),
  }
}
