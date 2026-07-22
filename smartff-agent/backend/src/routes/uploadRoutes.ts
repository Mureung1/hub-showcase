import express from 'express';
import multer from 'multer';
import { createUploadHandler, listUploadsHandler, deleteUploadHandler } from '../controllers/uploadController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('file'), createUploadHandler);
router.get('/', listUploadsHandler);
router.delete('/:id', deleteUploadHandler);

export default router;
