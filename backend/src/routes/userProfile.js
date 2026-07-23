import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { getUserProfile, getMyInviteCode } from '../controllers/userProfileController.js'

export const userProfileRouter = Router()

userProfileRouter.get('/me/invite-code', authMiddleware, getMyInviteCode)
userProfileRouter.get('/:userId/profile', authMiddleware, getUserProfile)
