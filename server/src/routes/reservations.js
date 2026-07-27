import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middlewares/requireUser.js'
import {
  createReservation,
  listMyReservations,
  listStoreReservations,
  confirmPickup,
} from '../services/reservationService.js'

const router = Router()

// POST /api/reservations/pickup — 픽업코드 검증 후 완료 처리 (사장님, W4)
router.post(
  '/pickup',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await confirmPickup(req.userId, req.body?.pickupCode))
  }),
)

// GET /api/reservations/me — 내 예약 목록 (M4)
router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listMyReservations(req.userId))
  }),
)

// GET /api/reservations/store — 내 가게에 들어온 예약 목록 (사장님)
router.get(
  '/store',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await listStoreReservations(req.userId))
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
