import { Router } from 'express';
import * as fridgeController from '../controllers/fridgeController.js';

const router = Router();

router.get('/alerts', fridgeController.getExpiryAlerts); // '/:id'보다 먼저 와야 alerts를 id로 오인하지 않음
router.get('/', fridgeController.getFridge);
router.post('/', fridgeController.createFridgeItem);
router.patch('/:id', fridgeController.updateFridgeItem);
router.delete('/:id', fridgeController.deleteFridgeItem);

export default router;
