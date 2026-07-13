import * as store from '../store.js';

export async function getCandidates(req, res) {
  res.json(await store.getMealPlanCandidates());
}

export async function buildWeekly(req, res) {
  const { pickedIds } = req.body;
  if (!Array.isArray(pickedIds) || pickedIds.length !== 2) {
    return res.status(400).json({ error: 'pickedIds는 정확히 2개여야 해요.' });
  }
  const plan = await store.buildWeeklyPlan(pickedIds);
  res.json(plan);
}

export async function getMealShoppingList(req, res) {
  const { weekPlanIds, multiplier = 1.0 } = req.body;
  if (!Array.isArray(weekPlanIds)) return res.status(400).json({ error: 'weekPlanIds 배열이 필요해요.' });
  res.json(await store.getMealShoppingList(weekPlanIds, parseFloat(multiplier)));
}
