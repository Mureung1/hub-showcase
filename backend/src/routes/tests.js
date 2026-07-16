import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { submitHobbyTest } from '../controllers/hobbyTestController.js'
import { submitDatingTest } from '../controllers/datingTestController.js'
import { submitLifestyleTest } from '../controllers/lifestyleTestController.js'

export const testsRouter = Router()

testsRouter.post('/hobby', authMiddleware, submitHobbyTest)
testsRouter.post('/dating', authMiddleware, submitDatingTest)
testsRouter.post('/lifestyle', authMiddleware, submitLifestyleTest)
