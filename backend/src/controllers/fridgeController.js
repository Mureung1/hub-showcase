import * as store from '../store.js';

export async function getFridge(req, res) {
  res.json(await store.getFridge());
}

export async function createFridgeItem(req, res) {
  const { ingredientId, name, quantityLabel, purchasedAt } = req.body;
  if (!quantityLabel || !purchasedAt) {
    return res.status(400).json({ error: 'quantityLabel, purchasedAt는 필수예요.' });
  }
  if (!ingredientId && !name) {
    return res.status(400).json({ error: 'ingredientId 또는 name 중 하나는 필요해요.' });
  }
  try {
    res.status(201).json(await store.addFridgeItem(req.body));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateFridgeItem(req, res) {
  const updated = await store.updateFridgeItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: `item ${req.params.id} not found` });
  res.json(updated);
}

export async function deleteFridgeItem(req, res) {
  const success = await store.deleteFridgeItem(req.params.id);
  if (!success) return res.status(404).json({ error: `item ${req.params.id} not found` });
  res.status(204).end();
}

export async function getExpiryAlerts(req, res) {
  res.json(await store.getExpiryAlerts());
}
