import express from 'express';

import { requestRecommendation } from '../controllers/recommendationController.js';

const router = express.Router();

router.post('/', requestRecommendation);

export default router;
