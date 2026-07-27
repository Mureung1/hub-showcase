import { Router } from 'express';
import { getTodayChallenge } from '../controllers/challenge.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const challengeRouter = Router();

challengeRouter.use(authMiddleware);
challengeRouter.get('/today', getTodayChallenge);
