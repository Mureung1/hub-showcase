import * as store from '../store.js';

export async function getShoppingSets(req, res) {
  const { match = 'all', level = 'all', pickedIds, multiplier, shareMealCount } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  const smc = parseInt(shareMealCount, 10) || 3;
  res.json(await store.getShoppingSets({ match, level, pickedIds: ids, multiplier: mult, shareMealCount: smc }));
}

export async function getShoppingList(req, res) {
  const { setId, pickedIds, multiplier, shareMealCount } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  const smc = parseInt(shareMealCount, 10) || 3;
  res.json(await store.getShoppingList(setId, ids, mult, smc));
}
