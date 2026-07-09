import { Router } from "express";
import { isAiConfigured } from "../config/env.js";
import { postGenerate } from "../controllers/generate.controller.js";

const router = Router();

// 헬스체크 — 서버가 살아있는지 + AI 생성이 구성됐는지 확인.
router.get("/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: isAiConfigured() });
});

// 포트폴리오 생성 (실 LLM 경로). 키 미설정 시 서비스가 503 을 던진다.
router.post("/generate", postGenerate);

export default router;
