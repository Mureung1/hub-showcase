import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { addFavorite, removeFavorite } from '../services/userService.js'

const router = Router()

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
