import { Router } from 'express';
import { getTodayChallenge } from '../controllers/challenge.controller.js';

export const challengeRouter = Router();

challengeRouter.get('/today', getTodayChallenge);
