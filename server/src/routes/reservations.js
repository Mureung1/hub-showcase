import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import { createReservation, listMyReservations } from '../services/reservationService.js'

const router = Router()

// GET /api/reservations/me — 내 예약 목록 (M4)
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listMyReservations(req.userId))
  }),
)

// POST /api/reservations — 예약 생성 (원자적 재고 차감 + 픽업코드 발급, M3)
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    res.status(201).json(await createReservation(req.userId, req.body))
  }),
)

export default router
