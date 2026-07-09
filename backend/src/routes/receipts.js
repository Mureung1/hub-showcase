import { Router } from 'express';
import * as receiptsController from '../controllers/receiptsController.js';

const router = Router();

router.post('/', receiptsController.createReceipt);
router.post('/:id/confirm', receiptsController.confirmReceipt);

export default router;
