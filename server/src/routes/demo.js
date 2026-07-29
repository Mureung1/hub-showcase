import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { claimConsumer, poolStatus } from '../services/demoService.js'

const router = Router()

/*
 * 시연용 계정 배정 (로그인 미구현 단계의 임시 장치).
 * 인증이 없으므로 누구나 호출할 수 있다 — 부스 시연 전용이며, 로그인 도입 시 제거한다.
 */

// POST /api/demo/consumer — 풀에서 소비자 계정 하나를 배정받는다
router.post(
  '/consumer',
  asyncHandler(async (req, res) => {
    res.json(await claimConsumer())
  }),
)

// GET /api/demo/pool — 풀 소진 현황 (시연 중 확인용)
router.get(
  '/pool',
  asyncHandler(async (req, res) => {
    res.json(await poolStatus())
  }),
)

export default router
