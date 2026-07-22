import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe, toggleStatus } from '../controllers/userController.js';

const router = Router();

router.get('/users/me', requireAuth, getMe);
router.post('/users/me/toggle-status', requireAuth, toggleStatus);

export default router;
