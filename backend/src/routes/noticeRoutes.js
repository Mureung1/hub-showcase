import express from "express";
import {
  createNotice,
  getNotices,
} from "../controllers/noticeController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createNotice);
router.get("/", getNotices);

// 뜻은 이렇게
// POST /api/notices → 로그인 검사 → 공지 등록
// GET /api/notices → 공지 목록 조회

export default router;