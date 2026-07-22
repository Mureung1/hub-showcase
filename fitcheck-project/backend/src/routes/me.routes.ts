import { Router } from 'express';
import { getMe, patchMe } from '../controllers/profiles.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, getMe);
router.patch('/', requireAuth, patchMe);

export default router;
