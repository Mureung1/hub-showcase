import * as store from '../store.js';

export async function createReceipt(req, res) {
  const receipt = await store.createReceipt(req.file);
  res.status(201).json(receipt);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export async function confirmReceipt(req, res) {
  const { expiryOverrides = {} } = req.body;
  const invalidDate = Object.values(expiryOverrides).some((d) => !DATE_ONLY.test(d));
  if (invalidDate) {
    return res.status(400).json({ error: 'expiryOverrides의 날짜는 YYYY-MM-DD 형식이어야 해요.' });
  }
  const fridge = await store.confirmReceipt(req.params.id, { expiryOverrides });
  if (!fridge) return res.status(404).json({ error: `receipt ${req.params.id} not found` });
  res.json(fridge);
}
