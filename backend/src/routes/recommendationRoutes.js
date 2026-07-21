import express from 'express';

import { requestRecommendation, getRecommendation } from '../controllers/recommendationController.js';

const router = express.Router();

router.post('/', requestRecommendation);
router.get('/:id', getRecommendation);

export default router;
