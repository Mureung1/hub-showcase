import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getPointsBalance, TEST_GRANT_POINTS } from '../lib/points.js'

export const pointsRouter = Router()
pointsRouter.use(requireAuth)

pointsRouter.get('/me', asyncHandler(async (req, res) => {
  res.json({ balance: await getPointsBalance(req.userId!) })
}))

// 개발 중 포인트 소비 흐름(상점 구매 등)을 테스트하기 위한 임시 지급 버튼용 엔드포인트.
// 근거 없는 지급이라 refType/refId를 남기지 않고, 매번 무제한으로 호출 가능하다.
pointsRouter.post('/test-grant', asyncHandler(async (req, res) => {
  await prisma.pointsLedgerEntry.create({ data: { userId: req.userId!, amount: TEST_GRANT_POINTS, reason: '테스트용 포인트 지급' } })
  res.json({ balance: await getPointsBalance(req.userId!) })
}))
