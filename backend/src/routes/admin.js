import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { listFailedTagging, reprocessTag, setMatchable, listFeedback } from '../controllers/adminController.js'

export const adminRouter = Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/tagging/failed', listFailedTagging)
adminRouter.post('/letters/:id/reprocess-tag', reprocessTag)
adminRouter.patch('/letters/:id/matchable', setMatchable)
adminRouter.get('/feedback', listFeedback)
