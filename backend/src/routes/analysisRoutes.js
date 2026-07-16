import express from 'express';

import { requestAnalysis, findAnalysis } from '../controllers/analysisController.js';

const router = express.Router();

router.post('/', requestAnalysis);
router.get('/:githubId', findAnalysis);

export default router;
