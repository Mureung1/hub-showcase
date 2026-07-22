import { Router } from 'express'
import { signup, login, logout, me } from '../controllers/auth.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const authRouter = Router()

authRouter.post('/signup', asyncHandler(signup))
authRouter.post('/login', asyncHandler(login))
authRouter.post('/logout', asyncHandler(logout))
authRouter.get('/me', asyncHandler(me))
