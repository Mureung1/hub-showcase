import { Router } from 'express'
import { checkUsername, signup, login } from '../controllers/authController.js'

export const authRouter = Router()

authRouter.post('/check-username', checkUsername)
authRouter.post('/signup', signup)
authRouter.post('/login', login)
