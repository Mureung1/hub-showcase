import { Router } from 'express'
import { createOrUpdateReview, getReviews } from '../controllers/harvestController.js'

const router = Router()

router.post('/:token/harvest-reviews', createOrUpdateReview)
router.get('/:token/harvest-reviews', getReviews)

export default router
