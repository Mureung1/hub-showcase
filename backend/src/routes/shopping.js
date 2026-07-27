import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/sets', async (req, res) => {
  const { match = 'all', level = 'all', pickedIds, multiplier, shareMealCount } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  const smc = parseInt(shareMealCount, 10) || 3;
  res.json(await store.getShoppingSets({ match, level, pickedIds: ids, multiplier: mult, shareMealCount: smc }));
});

router.get('/list', async (req, res) => {
  const { setId, pickedIds, multiplier, shareMealCount } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  const smc = parseInt(shareMealCount, 10) || 3;
  res.json(await store.getShoppingList(setId, ids, mult, smc));
});

export default router;
