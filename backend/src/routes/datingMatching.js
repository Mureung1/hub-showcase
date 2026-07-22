import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { matchDatingSame } from '../controllers/datingMatchingController.js'

export const datingMatchingRouter = Router()

datingMatchingRouter.post('/dating-same', authMiddleware, matchDatingSame)
