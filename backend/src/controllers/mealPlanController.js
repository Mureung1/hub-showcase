import * as store from '../store.js';

export async function getCandidates(req, res) {
  res.json(await store.getMealPlanCandidates());
}

export async function buildWeekly(req, res) {
  const { pickedIds } = req.body;
  // pickedIds는 0~2개를 허용 — buildWeeklyPlan 내부에서 유효성을 검사하고 폴백을 적용한다.
  // (이전에 length !== 2를 강제했더니 generateDynamicSets의 fullWeek 계산이 항상 실패했음)
  if (pickedIds !== undefined && !Array.isArray(pickedIds)) {
    return res.status(400).json({ error: 'pickedIds는 배열이어야 해요.' });
  }
  const plan = await store.buildWeeklyPlan(pickedIds ?? []);
  res.json(plan);
}

export async function getMealShoppingList(req, res) {
  const { weekPlanIds, multiplier = 1.0 } = req.body;
  if (!Array.isArray(weekPlanIds)) return res.status(400).json({ error: 'weekPlanIds 배열이 필요해요.' });
  res.json(await store.getMealShoppingList(weekPlanIds, parseFloat(multiplier)));
}
