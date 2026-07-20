import { Router } from 'express'
import { analyzeReviews, resetHistory, myReviews } from '../controllers/reviews.controller.js'

export const reviewsRouter = Router()

reviewsRouter.post('/analyze', analyzeReviews)
reviewsRouter.delete('/history', resetHistory)
reviewsRouter.get('/mine', myReviews)
