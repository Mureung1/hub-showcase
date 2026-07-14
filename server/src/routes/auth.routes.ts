import { Router } from 'express';
import { login, me, signup } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.get('/me', authMiddleware, me);
