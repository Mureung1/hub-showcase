import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { getMyChatRooms } from '../controllers/chatListController.js'

export const chatListRouter = Router()

chatListRouter.get('/my', authMiddleware, getMyChatRooms)
