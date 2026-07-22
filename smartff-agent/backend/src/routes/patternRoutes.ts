/**
 * Pattern Routes
 * GET /api/patterns/weekday?category=X
 * GET /api/patterns/hourly?category=X
 */

import express, { Router, Request, Response } from 'express';
import patternService from '../services/patternService';

const router: Router = express.Router();

router.get('/weekday', async (req: Request, res: Response) => {
  try {
    await patternService.loadData();

    const category = req.query.category as string;
    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    const data = patternService.getWeekdayPattern(category);
    res.json({ category, data });
  } catch (error) {
    console.error('Error in /patterns/weekday:', error);
    res.status(500).json({ error: String(error) });
  }
});

router.get('/hourly', async (req: Request, res: Response) => {
  try {
    await patternService.loadData();

    const category = req.query.category as string;
    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    const data = patternService.getHourlyPattern(category);
    res.json({ category, data });
  } catch (error) {
    console.error('Error in /patterns/hourly:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
