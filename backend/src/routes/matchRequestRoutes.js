import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import {
  sendMatchRequest,
  acceptRequest,
  rejectRequest,
} from '../controllers/matchRequestController.js'

export const matchRequestRouter = Router()

matchRequestRouter.post('/', authMiddleware, sendMatchRequest)
matchRequestRouter.patch('/:requestId/accept', authMiddleware, acceptRequest)
matchRequestRouter.patch('/:requestId/reject', authMiddleware, rejectRequest)
