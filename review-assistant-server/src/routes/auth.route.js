import { Router } from 'express'
import { signup, login, logout, me } from '../controllers/auth.controller.js'

export const authRouter = Router()

authRouter.post('/signup', signup)
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.get('/me', me)
