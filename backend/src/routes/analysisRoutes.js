import express from "express";
import { analyzeNoticeHandler } from "../controllers/analysisController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/notices/analyze - 텍스트 또는 PDF에서 추출한 텍스트 분석
router.post("/analyze", authMiddleware, analyzeNoticeHandler);

export default router;
