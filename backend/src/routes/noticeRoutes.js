import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  createNotice,
  getNotices,
  uploadPDF,
} from "../controllers/noticeController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    // 파일명 충돌 방지: timestamp + random + 원본 확장자
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    cb(null, `pdf_${timestamp}_${random}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = express.Router();

router.post("/", authMiddleware, createNotice);
router.get("/", authMiddleware, getNotices);
router.post("/upload", authMiddleware, upload.single("file"), uploadPDF);

// 라우트 설명:
// POST /api/notices → 로그인 검사 → 텍스트 공지 등록
// GET /api/notices → 로그인 검사 → 공지 목록 조회
// POST /api/notices/upload → 로그인 검사 → PDF 파일 업로드

export default router;
