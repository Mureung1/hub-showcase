import express from "express";
import { saveEventsHandler } from "../controllers/eventsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/events - 일정 저장
router.post("/", authMiddleware, saveEventsHandler);

export default router;
