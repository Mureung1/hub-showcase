import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { submitRoommateProfile } from '../controllers/roommateProfileController.js'

export const roommateProfileRouter = Router()

roommateProfileRouter.post('/', authMiddleware, submitRoommateProfile)
