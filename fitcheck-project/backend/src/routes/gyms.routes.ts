import { Router } from 'express';
import {
  getGym,
  getGyms,
  getGymTrainers,
  postSyncNearbyGyms,
} from '../controllers/gyms.controller.js';

const router = Router();

router.get('/', getGyms);
router.post('/sync-nearby', postSyncNearbyGyms);
router.get('/:gymId/trainers', getGymTrainers);
router.get('/:id', getGym);

export default router;
