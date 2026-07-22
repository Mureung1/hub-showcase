import express from "express";
import { saveEventsHandler, getEventsHandler, checkDuplicateHandler } from "../controllers/eventsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/events - 일정 조회
router.get("/", authMiddleware, getEventsHandler);

// POST /api/events/check-duplicate - 중복 검사
router.post("/check-duplicate", authMiddleware, checkDuplicateHandler);

// POST /api/events - 일정 저장
router.post("/", authMiddleware, saveEventsHandler);

export default router;
