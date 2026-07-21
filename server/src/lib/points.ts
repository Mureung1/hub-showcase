import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'

export const SCHEDULE_COMPLETE_POINTS = 50
export const REACTION_POINTS = 10

// refType+refId가 같은 지급은 한 번만 성공한다(유니크 제약 위반은 조용히 무시) — 체크 해제 후
// 다시 체크하거나, 반응을 지웠다가 다시 남겨도 같은 근거로는 중복 지급되지 않는다.
export async function awardPointsOnce(userId: string, refType: string, refId: string, amount: number, reason: string) {
  try {
    await prisma.pointsLedgerEntry.create({ data: { userId, amount, reason, refType, refId } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return
    throw error
  }
}

export async function getPointsBalance(userId: string) {
  const result = await prisma.pointsLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } })
  return result._sum.amount ?? 0
}
