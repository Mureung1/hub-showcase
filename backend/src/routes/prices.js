import { Router } from 'express';
import * as pricesController from '../controllers/pricesController.js';

const router = Router();

router.get('/', pricesController.getPrices);

export default router;
