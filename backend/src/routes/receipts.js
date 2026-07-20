import { Router } from 'express';
import multer from 'multer';
import * as receiptsController from '../controllers/receiptsController.js';

// 메모리 저장 — 디스크에 남길 필요 없이 버퍼를 그대로 base64로 인코딩해 Clova OCR에 보낸다.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 영수증 사진 한 장, 8MB면 충분
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const router = Router();

router.post('/', upload.single('photo'), receiptsController.createReceipt);
router.post('/:id/confirm', receiptsController.confirmReceipt);

export default router;
