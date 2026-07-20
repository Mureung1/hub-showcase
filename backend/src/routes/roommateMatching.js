import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { matchRoommate } from '../controllers/roommateMatchingController.js'

export const roommateMatchingRouter = Router()

roommateMatchingRouter.post('/roommate', authMiddleware, matchRoommate)
