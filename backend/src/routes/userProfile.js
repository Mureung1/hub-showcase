import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { getUserProfile } from '../controllers/userProfileController.js'

export const userProfileRouter = Router()

userProfileRouter.get('/:userId/profile', authMiddleware, getUserProfile)
