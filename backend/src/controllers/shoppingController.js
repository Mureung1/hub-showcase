import * as store from '../store.js';

export function getShoppingSets(req, res) {
  const { match = 'all', level = 'all' } = req.query;
  res.json(store.getShoppingSets({ match, level }));
}

export function getShoppingList(req, res) {
  res.json(store.getShoppingList(req.query.setId));
}
