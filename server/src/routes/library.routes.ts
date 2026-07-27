import { Router } from 'express';
import {
  addPaperToLibraryController,
  getUserLibraryController,
  deletePaperFromLibraryController
} from '../controllers/library.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/library', requireAuth, addPaperToLibraryController);
router.get('/library/:userId', requireAuth, getUserLibraryController);
router.delete('/library/:userId/:paperId', requireAuth, deletePaperFromLibraryController);

export default router;
