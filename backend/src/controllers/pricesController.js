import * as store from '../store.js';

export function getPrices(req, res) {
  res.json(store.getPrices());
}
