import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { createDeal, listDealsByStore } from '../services/dealService.js'

const router = Router()

// GET /api/deals?storeId= — 가게별 딜 목록 (W3 기초. 소비자용 위치 기반 목록은 T-06에서 확장)
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
