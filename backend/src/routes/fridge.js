import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

// '/:id'보다 먼저 와야 alerts를 id로 오인하지 않음
router.get('/alerts', async (req, res) => {
  res.json(await store.getExpiryAlerts());
});

// 만료 재료를 통째로 버리는 동작이라 멱등하지 않다 — DELETE /:id와 경로가 겹치지 않게 POST로 둔다.
router.post('/discard-expired', async (req, res) => {
  res.json(await store.discardExpiredItems());
});

router.get('/', async (req, res) => {
  res.json(await store.getFridge());
});

router.post('/', async (req, res) => {
  const { ingredientId, name, quantityLabel, purchasedAt } = req.body;
  if (!quantityLabel || !purchasedAt) {
    return res.status(400).json({ error: 'quantityLabel, purchasedAt는 필수예요.' });
  }
  if (!ingredientId && !name) {
    return res.status(400).json({ error: 'ingredientId 또는 name 중 하나는 필요해요.' });
  }
  if (Number.isNaN(Date.parse(purchasedAt))) {
    return res.status(400).json({ error: 'purchasedAt은 올바른 날짜 형식이어야 해요.' });
  }
  try {
    res.status(201).json(await store.addFridgeItem(req.body));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { expiryDate } = req.body;
  if (expiryDate && Number.isNaN(Date.parse(expiryDate))) {
    return res.status(400).json({ error: 'expiryDate는 올바른 날짜 형식이어야 해요.' });
  }
  const updated = await store.updateFridgeItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: `item ${req.params.id} not found` });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const success = await store.deleteFridgeItem(req.params.id);
  if (!success) return res.status(404).json({ error: `item ${req.params.id} not found` });
  res.status(204).end();
});

export default router;
