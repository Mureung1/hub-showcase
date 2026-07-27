import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import {
  getMyTeam,
  confirmTeam,
  confirmSoloTeam,
  getOppositeMatches,
} from '../controllers/datingTeamController.js'

export const datingTeamRouter = Router()

datingTeamRouter.get('/me', authMiddleware, getMyTeam)
datingTeamRouter.post('/solo-confirm', authMiddleware, confirmSoloTeam)
datingTeamRouter.patch('/:teamId/confirm', authMiddleware, confirmTeam)
datingTeamRouter.get('/:teamId/opposite-matches', authMiddleware, getOppositeMatches)
