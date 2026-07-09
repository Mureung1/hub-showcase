import { Router } from 'express'
import { analyzeReviews, resetHistory } from '../controllers/reviews.controller.js'

export const reviewsRouter = Router()

reviewsRouter.post('/analyze', analyzeReviews)
reviewsRouter.delete('/history', resetHistory)
