import express from 'express';
import { createUploadHandler, listUploadsHandler, deleteUploadHandler } from '../controllers/uploadController';

const router = express.Router();

router.post('/', createUploadHandler);
router.get('/', listUploadsHandler);
router.delete('/:id', deleteUploadHandler);

export default router;
