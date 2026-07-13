import * as store from '../store.js';

export async function getShoppingSets(req, res) {
  const { match = 'all', level = 'all', pickedIds, multiplier } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  res.json(await store.getShoppingSets({ match, level, pickedIds: ids, multiplier: mult }));
}

export async function getShoppingList(req, res) {
  const { setId, pickedIds, multiplier } = req.query;
  const ids = pickedIds ? pickedIds.split(',').filter(Boolean) : [];
  const mult = parseFloat(multiplier) || 1.0;
  res.json(await store.getShoppingList(setId, ids, mult));
}
