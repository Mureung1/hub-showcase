import { Router } from 'express';
import { ingredients } from '../data/ingredients.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ingredients });
});

export default router;
