import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res) => {
  const { filter = 'all', level = 'all', category = 'all', search = '', sort = 'default' } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 30, 100); // 한 번에 최대 100개까지만 허용
  res.json(await store.listRecipes({ filter, level, category, search, page, pageSize, sort }));
});

router.get('/:id', async (req, res) => {
  const multiplier = req.query.multiplier === undefined ? 1.0 : parseFloat(req.query.multiplier);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return res.status(400).json({ error: 'multiplier는 0보다 큰 숫자여야 해요.' });
  }
  const detail = await store.getRecipeDetail(req.params.id, multiplier);
  if (!detail) return res.status(404).json({ error: `recipe ${req.params.id} not found` });
  res.json(detail);
});

router.post('/:id/cook-done', async (req, res) => {
  const { deductions } = req.body;
  if (!Array.isArray(deductions)) return res.status(400).json({ error: 'deductions 배열이 필요해요.' });
  const invalid = deductions.some(
    (d) => !d || typeof d.id !== 'string' || !d.id || !Number.isFinite(d.use) || d.use < 0,
  );
  if (invalid) {
    return res.status(400).json({ error: 'deductions의 각 항목은 { id: string, use: 0 이상 숫자 } 형태여야 해요.' });
  }
  try {
    res.json(await store.cookDone(req.params.id, deductions));
  } catch (err) {
    const body = { error: err.message };
    if (err.partiallyApplied) body.partiallyApplied = err.partiallyApplied;
    if (err.failed) body.failed = err.failed;
    if (err.notAttempted) body.notAttempted = err.notAttempted;
    res.status(err.status || 500).json(body);
  }
});

export default router;
