import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { submitHobbyTest } from '../controllers/hobbyTestController.js'

export const testsRouter = Router()

testsRouter.post('/hobby', authMiddleware, submitHobbyTest)
