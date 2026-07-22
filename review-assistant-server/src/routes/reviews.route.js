import { Router } from 'express'
import { analyzeReviews, resetHistory, myReviews } from '../controllers/reviews.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const reviewsRouter = Router()

reviewsRouter.post('/analyze', asyncHandler(analyzeReviews))
reviewsRouter.delete('/history', asyncHandler(resetHistory))
reviewsRouter.get('/mine', asyncHandler(myReviews))
