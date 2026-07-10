import * as store from '../store.js';

export function listRecipes(req, res) {
  const { filter = 'all', level = 'all' } = req.query;
  res.json(store.listRecipes({ filter, level }));
}

export function getRecipeDetail(req, res) {
  const detail = store.getRecipeDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: `recipe ${req.params.id} not found` });
  res.json(detail);
}

export function cookDone(req, res) {
  const { deductions } = req.body;
  if (!Array.isArray(deductions)) return res.status(400).json({ error: 'deductions 배열이 필요해요.' });
  try {
    res.json(store.cookDone(req.params.id, deductions));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
