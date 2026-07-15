import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import {
  extractText,
  SUPPORTED_TRANSCRIPT_EXTENSIONS,
} from '../lib/transcriptExtractor';

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (SUPPORTED_TRANSCRIPT_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`지원하지 않는 파일 형식입니다: ${ext || '(확장자 없음)'}`));
    }
  },
});

// POST /api/extract — 단일 전사문 파일을 받아 plain text로 추출해 반환.
router.post('/', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof Error) {
      return res.status(415).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '업로드된 파일이 없습니다.' });
    }

    try {
      const text = extractText(req.file.originalname, req.file.buffer);
      return res.status(200).json({ filename: req.file.originalname, text });
    } catch (extractErr) {
      const message =
        extractErr instanceof Error ? extractErr.message : '파일에서 텍스트를 추출하지 못했습니다.';
      return res.status(415).json({ error: message });
    }
  });
});

export default router;
