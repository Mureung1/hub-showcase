import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'

export const SCHEDULE_COMPLETE_POINTS = 50
export const REACTION_POINTS = 10
export const TEST_GRANT_POINTS = 50

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

// 잔액이 부족하면 기록을 만들지 않고 null을 반환한다. tx를 받는 버전은 구매 로직처럼
// 소유 여부 확인 등 다른 쓰기와 하나의 트랜잭션으로 묶어야 할 때 쓴다.
export async function spendPointsTx(tx: Prisma.TransactionClient, userId: string, amount: number, reason: string, refType?: string, refId?: string) {
  const result = await tx.pointsLedgerEntry.aggregate({ where: { userId }, _sum: { amount: true } })
  const balance = result._sum.amount ?? 0
  if (balance < amount) return null
  await tx.pointsLedgerEntry.create({ data: { userId, amount: -amount, reason, refType, refId } })
  return balance - amount
}

// 단독으로 포인트만 차감할 때 쓰는 버전 — 잔액 확인과 차감 기록 생성을 하나의 트랜잭션으로 묶어
// 동시 요청으로 잔액이 마이너스가 되는 걸 막는다.
export async function spendPoints(userId: string, amount: number, reason: string, refType?: string, refId?: string) {
  return prisma.$transaction((tx) => spendPointsTx(tx, userId, amount, reason, refType, refId))
}
