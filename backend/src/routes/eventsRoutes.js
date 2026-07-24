import express from "express";
import { saveEventsHandler, getEventsHandler, checkDuplicateHandler, updateEventHandler, deleteEventHandler } from "../controllers/eventsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/events - 일정 조회
router.get("/", authMiddleware, getEventsHandler);

// POST /api/events/check-duplicate - 중복 검사
router.post("/check-duplicate", authMiddleware, checkDuplicateHandler);

// POST /api/events - 일정 저장
router.post("/", authMiddleware, saveEventsHandler);

// PATCH /api/events/:id - 일정 수정
router.patch("/:id", authMiddleware, updateEventHandler);

// DELETE /api/events/:id - 일정 삭제
router.delete("/:id", authMiddleware, deleteEventHandler);

export default router;
