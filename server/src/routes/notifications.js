import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { listMyNotifications } from '../services/notificationService.js'

const router = Router()

// GET /api/notifications/me — 인앱 알림 목록 (푸시 미수신 대비 폴백)
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listMyNotifications(req.userId))
  }),
)

export default router
