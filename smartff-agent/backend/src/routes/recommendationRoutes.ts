/**
 * Recommendation Routes
 * GET /api/recommendations
 */

import express, { Router, Request, Response } from 'express';
import financialService from '../services/financialService';
import recommendationService from '../services/RecommendationService';

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    await financialService.loadData();

    const result = recommendationService.getRecommendations();
    res.json(result);
  } catch (error) {
    console.error('Error in /recommendations:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
