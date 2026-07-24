import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import {
  sendTeamInvite,
  getReceivedInvites,
  respondToInvite,
} from '../controllers/teamInviteController.js'

export const teamInviteRouter = Router()

teamInviteRouter.post('/', authMiddleware, sendTeamInvite)
teamInviteRouter.get('/received', authMiddleware, getReceivedInvites)
teamInviteRouter.patch('/:inviteId', authMiddleware, respondToInvite)
