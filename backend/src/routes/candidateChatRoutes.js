import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { createChatRoom, sendMessage, getMessages } from '../controllers/candidateChatController.js'

export const candidateChatRouter = Router()

candidateChatRouter.post('/', authMiddleware, createChatRoom)
candidateChatRouter.post('/:chatRoomId/messages', authMiddleware, sendMessage)
candidateChatRouter.get('/:chatRoomId/messages', authMiddleware, getMessages)
