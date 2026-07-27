import { Router } from 'express';
import { curatePapersController } from '../controllers/curate.controller.js';

const router = Router();

router.post('/curate', curatePapersController);

export default router;
