import * as store from '../store.js';

export async function createReceipt(req, res) {
  const receipt = await store.createReceipt(req.file);
  res.status(201).json(receipt);
}

export async function confirmReceipt(req, res) {
  const fridge = await store.confirmReceipt(req.params.id, { expiryOverrides: req.body.expiryOverrides });
  if (!fridge) return res.status(404).json({ error: `receipt ${req.params.id} not found` });
  res.json(fridge);
}
