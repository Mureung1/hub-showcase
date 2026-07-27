import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/candidates', async (req, res) => {
  res.json(await store.getMealPlanCandidates());
});

router.post('/weekly', async (req, res) => {
  const { pickedIds, difficulty, type } = req.body;
  if (pickedIds !== undefined && !Array.isArray(pickedIds)) {
    return res.status(400).json({ error: 'pickedIds는 배열이어야 해요.' });
  }
  const plan = await store.buildWeeklyPlan(pickedIds ?? [], undefined, undefined, difficulty, type);
  res.json(plan);
});

router.post('/shopping-list', async (req, res) => {
  const { weekPlanIds, multiplier = 1.0 } = req.body;
  if (!Array.isArray(weekPlanIds)) return res.status(400).json({ error: 'weekPlanIds 배열이 필요해요.' });
  const parsedMultiplier = parseFloat(multiplier);
  if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
    return res.status(400).json({ error: 'multiplier는 0보다 큰 숫자여야 해요.' });
  }
  res.json(await store.getMealShoppingList(weekPlanIds, parsedMultiplier));
});

export default router;
