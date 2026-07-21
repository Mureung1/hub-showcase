/**
 * Financial Routes
 * GET /api/financial/summary
 * GET /api/financial/category
 * GET /api/financial/month/:month
 */

import express, { Router, Request, Response } from 'express';
import financialService from '../services/financialService';
import { FinancialFilter } from '../types/financial';

const router: Router = express.Router();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    await financialService.loadData();

    const months = req.query.months
      ? (req.query.months as string).split(',').map(Number)
      : undefined;

    const categories = req.query.categories
      ? (req.query.categories as string).split(',')
      : undefined;

    const filter: FinancialFilter = {
      months,
      categories,
    };

    const summary = financialService.getSummary(filter);
    res.json(summary);
  } catch (error) {
    console.error('Error in /summary:', error);
    res.status(500).json({ error: String(error) });
  }
});

router.get('/category', async (req: Request, res: Response) => {
  try {
    await financialService.loadData();

    const summary = financialService.getCategorySummary();
    res.json({
      data: summary,
    });
  } catch (error) {
    console.error('Error in /category:', error);
    res.status(500).json({ error: String(error) });
  }
});

router.get('/month/:month', async (req: Request, res: Response) => {
  try {
    await financialService.loadData();

    const month = parseInt(req.params.month as string, 10);
    if (isNaN(month) || month < 1 || month > 6) {
      return res.status(400).json({ error: 'Invalid month (1-6)' });
    }

    const data = financialService.getMonthSummary(month);
    res.json({
      month,
      data,
    });
  } catch (error) {
    console.error('Error in /month:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
