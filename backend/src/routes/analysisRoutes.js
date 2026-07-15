import express from 'express';

import { requestAnalysis } from '../controllers/analysisController.js';

const router = express.Router();

router.post('/', requestAnalysis);

export default router;
