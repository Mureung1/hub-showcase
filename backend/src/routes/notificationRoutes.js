import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { getSummary } from '../controllers/notificationController.js'

export const notificationRouter = Router()

notificationRouter.get('/summary', authMiddleware, getSummary)
