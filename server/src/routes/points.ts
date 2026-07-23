import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../auth/requireAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { awardPointsOnce, getPointsBalance, REACTION_POINTS, TEST_GRANT_POINTS } from '../lib/points.js'

export const pointsRouter = Router()
pointsRouter.use(requireAuth)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

pointsRouter.get('/me', asyncHandler(async (req, res) => {
  res.json({ balance: await getPointsBalance(req.userId!) })
}))

// 개발 중 포인트 소비 흐름(상점 구매 등)을 테스트하기 위한 임시 지급 버튼용 엔드포인트.
// 근거 없는 지급이라 refType/refId를 남기지 않고, 매번 무제한으로 호출 가능하다.
pointsRouter.post('/test-grant', asyncHandler(async (req, res) => {
  await prisma.pointsLedgerEntry.create({ data: { userId: req.userId!, amount: TEST_GRANT_POINTS, reason: '테스트용 포인트 지급' } })
  res.json({ balance: await getPointsBalance(req.userId!) })
}))

pointsRouter.post('/reaction', asyncHandler(async (req, res) => {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) {
    res.status(400).json({ error: '요청 본문이 필요합니다.' })
    return
  }

  const { postId } = body as Record<string, unknown>
  if (!isNonEmptyString(postId)) {
    res.status(400).json({ error: 'postId는 필수입니다.' })
    return
  }

  // 실제 내 영상 게시물이면 자기 게시물에 스스로 반응해 포인트를 버는 걸 막는다.
  // (mock 친구 게시물처럼 실제 VideoPost가 아닌 id는 이 조회가 null이라 그냥 통과된다.)
  const video = await prisma.videoPost.findUnique({ where: { id: postId } })
  const isOwnPost = video !== null && video.userId === req.userId

  // 같은 게시물에 반응을 지웠다가 다시 남겨도(postId가 동일) 최초 1회만 지급된다.
  if (!isOwnPost) {
    await awardPointsOnce(req.userId!, 'REACTION', postId, REACTION_POINTS, '친구 반응')
  }
  res.json({ balance: await getPointsBalance(req.userId!) })
}))
