import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { getMySettings, updateMySettings } from '../services/userService.js'

const router = Router()

// GET /api/users/me — 내 알림 설정 (M5)
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await getMySettings(req.userId))
  }),
)

// PATCH /api/users/me — 관심 카테고리·위치 조건 저장 (M5)
router.patch(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await updateMySettings(req.userId, req.body ?? {}))
  }),
)

export default router
