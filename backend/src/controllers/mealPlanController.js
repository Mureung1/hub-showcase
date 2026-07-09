import * as store from '../store.js';

export function getCandidates(req, res) {
  res.json(store.getMealPlanCandidates());
}

export function buildWeekly(req, res) {
  const { pickedIds } = req.body;
  const plan = store.buildWeeklyPlan(pickedIds);
  if (!plan) return res.status(400).json({ error: 'pickedIds는 정확히 2개여야 해요.' });
  res.json(plan);
}

export function getMealShoppingList(req, res) {
  const { weekPlanIds } = req.body;
  if (!Array.isArray(weekPlanIds)) return res.status(400).json({ error: 'weekPlanIds 배열이 필요해요.' });
  res.json(store.getMealShoppingList(weekPlanIds));
}
