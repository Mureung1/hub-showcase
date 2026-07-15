import express from 'express';
import { createUploadHandler, listUploadsHandler } from '../controllers/uploadController';

const router = express.Router();

router.post('/', createUploadHandler);
router.get('/', listUploadsHandler);

export default router;
