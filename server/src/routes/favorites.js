import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { addFavorite, removeFavorite, listMyFavorites } from '../services/userService.js'

const router = Router()

// GET /api/favorites — 내 관심 가게 목록 (M1)
router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listMyFavorites(req.userId))
  }),
)

// POST /api/favorites — 즐겨찾기 추가 (M1)
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    res.status(201).json(await addFavorite(req.userId, req.body?.storeId))
  }),
)

// DELETE /api/favorites/:storeId — 즐겨찾기 해제 (M1)
router.delete(
  '/:storeId',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await removeFavorite(req.userId, req.params.storeId))
  }),
)

export default router
