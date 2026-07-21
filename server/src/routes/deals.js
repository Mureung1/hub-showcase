import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { createDeal, listDealsByStore, listNearbyDeals } from '../services/dealService.js'

const router = Router()

// GET /api/deals/nearby — 소비자 기준 위치 반경 내 활성 딜 (거리순, M2)
router.get(
  '/nearby',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listNearbyDeals(req.userId))
  }),
)

// GET /api/deals?storeId= — 가게별 딜 목록 (사장님 대시보드 W3)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await listDealsByStore(Number(req.query.storeId)))
  }),
)

// POST /api/deals — 마감 상품 등록 (W2)
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    res.status(201).json(await createDeal(req.userId, req.body))
  }),
)

export default router
