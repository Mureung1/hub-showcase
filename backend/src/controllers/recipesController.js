import * as store from '../store.js';

export async function listRecipes(req, res) {
  const { filter = 'all', level = 'all', category = 'all', sort = 'default' } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 30, 100); // 한 번에 최대 100개까지만 허용
  res.json(await store.listRecipes({ filter, level, category, page, pageSize, sort }));
}

export async function getRecipeDetail(req, res) {
  const multiplier = parseFloat(req.query.multiplier) || 1.0;
  const detail = await store.getRecipeDetail(req.params.id, multiplier);
  if (!detail) return res.status(404).json({ error: `recipe ${req.params.id} not found` });
  res.json(detail);
}

export async function cookDone(req, res) {
  const { deductions } = req.body;
  if (!Array.isArray(deductions)) return res.status(400).json({ error: 'deductions 배열이 필요해요.' });
  try {
    res.json(await store.cookDone(req.params.id, deductions));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
