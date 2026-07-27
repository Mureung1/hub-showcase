import { Router } from 'express';
import multer from 'multer';
import * as store from '../store.js';

// 메모리 저장 — 디스크에 남길 필요 없이 버퍼를 그대로 base64로 인코딩해 Clova OCR에 보낸다.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 영수증 사진 한 장, 8MB면 충분
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const router = Router();

router.post('/', upload.single('photo'), async (req, res) => {
  const receipt = await store.createReceipt(req.file);
  res.status(201).json(receipt);
});

router.post('/:id/confirm', async (req, res) => {
  const { expiryOverrides = {} } = req.body;
  const invalidDate = Object.values(expiryOverrides).some((d) => !DATE_ONLY.test(d));
  if (invalidDate) {
    return res.status(400).json({ error: 'expiryOverrides의 날짜는 YYYY-MM-DD 형식이어야 해요.' });
  }
  const fridge = await store.confirmReceipt(req.params.id, { expiryOverrides });
  if (!fridge) return res.status(404).json({ error: `receipt ${req.params.id} not found` });
  res.json(fridge);
});

export default router;
