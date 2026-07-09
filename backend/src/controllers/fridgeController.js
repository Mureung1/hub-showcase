import * as store from '../store.js';

export function getFridge(req, res) {
  res.json(store.getFridge());
}

export function createFridgeItem(req, res) {
  const { name, quantityLabel, purchasedAt, expiryDate } = req.body;
  if (!name || !quantityLabel || !purchasedAt || !expiryDate) {
    return res.status(400).json({ error: 'name, quantityLabel, purchasedAt, expiryDate는 필수예요.' });
  }
  const item = store.addFridgeItem({ name, quantityLabel, purchasedAt, expiryDate });
  res.status(201).json(item);
}

export function updateFridgeItem(req, res) {
  const item = store.updateFridgeItem(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: `fridge item ${req.params.id} not found` });
  res.json(item);
}

export function deleteFridgeItem(req, res) {
  const ok = store.deleteFridgeItem(req.params.id);
  if (!ok) return res.status(404).json({ error: `fridge item ${req.params.id} not found` });
  res.status(204).end();
}

export function getExpiryAlerts(req, res) {
  res.json(store.getExpiryAlerts());
}
