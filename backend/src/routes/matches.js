import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { getMatch, getMyMatches, patchMatch, postReply } from '../controllers/matchesController.js'

export const matchesRouter = Router()

matchesRouter.get('/', requireAuth, getMyMatches)
matchesRouter.get('/:id', requireAuth, getMatch)
matchesRouter.patch('/:id', requireAuth, patchMatch)
matchesRouter.post('/:matchId/reply', requireAuth, postReply)
