import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { sendMessage, getMessages } from '../controllers/teamMatchChatController.js'

export const teamMatchChatRouter = Router()

teamMatchChatRouter.post('/:chatRoomId/messages', authMiddleware, sendMessage)
teamMatchChatRouter.get('/:chatRoomId/messages', authMiddleware, getMessages)
