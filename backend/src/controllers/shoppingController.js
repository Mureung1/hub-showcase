import * as store from '../store.js';

export function getShoppingSets(req, res) {
  res.json(store.getShoppingSets());
}

export function getShoppingList(req, res) {
  res.json(store.getShoppingList());
}
