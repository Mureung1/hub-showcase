import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { patchMatch } from '../controllers/matchesController.js'

export const matchesRouter = Router()

matchesRouter.patch('/:id', requireAuth, patchMatch)
