// letters.js에서 '/:id/recommendations'로 마운트된다 — :id를 쓰려면 mergeParams가 필요하다.
import { Router } from 'express'
import { getCurrent, postRecommendation, postRefresh } from '../controllers/recommendationsController.js'

export const recommendationsRouter = Router({ mergeParams: true })

recommendationsRouter.post('/', postRecommendation)
recommendationsRouter.get('/current', getCurrent)
recommendationsRouter.post('/refresh', postRefresh)
