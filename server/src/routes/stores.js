import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { getMyStore, createStore } from '../services/storeService.js'

const router = Router()

// GET /api/stores/me — 내 가게 조회 (가게 등록 여부 분기용, W1)
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await getMyStore(req.userId))
  }),
)

// POST /api/stores — 가게 등록 (최초 1회, W1)
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const store = await createStore(req.userId, req.body)
    res.status(201).json(store)
  }),
)

export default router
