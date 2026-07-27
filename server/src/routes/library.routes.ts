import { Router } from 'express';
import {
  addPaperToLibraryController,
  getUserLibraryController,
  deletePaperFromLibraryController
} from '../controllers/library.controller.js';

const router = Router();

router.post('/library', addPaperToLibraryController);
router.get('/library/:userId', getUserLibraryController);
router.delete('/library/:userId/:paperId', deletePaperFromLibraryController);

export default router;
