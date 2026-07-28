import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { sendMatchRequest } from '../controllers/matchRequestController.js'

export const matchRequestRouter = Router()

matchRequestRouter.post('/', authMiddleware, sendMatchRequest)
