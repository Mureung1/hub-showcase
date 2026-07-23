import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { httpError } from '../lib/httpError.js'
import { registerToken } from '../services/pushService.js'

const router = Router()

// POST /api/device-tokens — 브라우저에서 발급받은 FCM 토큰 등록 (T-13)
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const token = req.body?.token
    if (typeof token !== 'string' || token.trim().length < 20) {
      throw httpError(400, '유효한 토큰이 아닙니다.')
    }
    await registerToken(req.userId, token.trim())
    res.status(201).json({ ok: true })
  }),
)

export default router
