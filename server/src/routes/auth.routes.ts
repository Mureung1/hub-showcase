import { Router } from 'express';
import { login, signup } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
