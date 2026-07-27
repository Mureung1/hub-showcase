import { Router } from 'express';
import * as store from '../store.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.getPrices(req.query.q));
  } catch (err) {
    next(err);
  }
});

export default router;
