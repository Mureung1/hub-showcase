import { Router } from 'express';
import { getVapidPublicKey, addSubscription, removeSubscription } from '../push.js';

const router = Router();

router.get('/public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', (req, res) => {
  try {
    addSubscription(req.body);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/unsubscribe', (req, res) => {
  removeSubscription(req.body?.endpoint);
  res.status(204).end();
});

export default router;
