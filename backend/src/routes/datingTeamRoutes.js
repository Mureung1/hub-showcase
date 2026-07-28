import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import {
  getMyTeam,
  confirmTeam,
  confirmSoloTeam,
  getOppositeMatches,
  getDatingTeamDetailInfo,
} from '../controllers/datingTeamController.js'

export const datingTeamRouter = Router()

datingTeamRouter.get('/me', authMiddleware, getMyTeam)
datingTeamRouter.post('/solo-confirm', authMiddleware, confirmSoloTeam)
datingTeamRouter.patch('/:teamId/confirm', authMiddleware, confirmTeam)
datingTeamRouter.get('/:teamId/opposite-matches', authMiddleware, getOppositeMatches)
// '/me'보다 뒤에 둬야 한다 — 먼저 오면 '/me' 요청도 이 :teamId 라우트에 걸릴 수 있음
datingTeamRouter.get('/:teamId', authMiddleware, getDatingTeamDetailInfo)
