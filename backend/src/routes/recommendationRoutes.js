import express from 'express';

import { requestRecommendation, getRecommendation, getRecommendationHistory } from '../controllers/recommendationController.js';

const router = express.Router();

router.post('/', requestRecommendation);
router.get('/', getRecommendationHistory);
router.get('/:id', getRecommendation);

export default router;
