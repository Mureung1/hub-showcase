import "dotenv/config";
import express from "express";
import cors from "cors";
import { saveResult, listResults, deleteResults, countAll } from "./store.js";

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "16kb" }));

// 표준 헬스체크 — 서버가 살아있는지 확인(의료 아님).
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storedCount: countAll(), time: new Date().toISOString() });
});

// 연구용 비식별 필드만 허용한다. 이름·자유응답·PII는 저장하지 않는다.
const ALLOWED_FIELDS = [
  "anonId",
  "mbti",
  "temperament",
  "matchedMethods",
  "baselineMethods",
  "fitScore",
  "understanding",
  "actionability",
  "focus",
  "fatigue",
  "calibrationError",
  "algorithmVersion",
];

function pickAllowed(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      out[key] = body[key];
    }
  }
  return out;
}

// 저장: 동의(consent) + anonId 필수. 비식별 요약만 수용.
app.post("/api/results", (req, res) => {
  const body = req.body || {};
  if (!body.consent) {
    return res.status(400).json({ error: "consent_required" });
  }
  if (!body.anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  const record = saveResult(pickAllowed(body));
  return res.status(201).json(record);
});

// 조회: 이 anonId의 기록만.
app.get("/api/results", (req, res) => {
  const { anonId } = req.query;
  if (!anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  return res.json(listResults(anonId));
});

// 삭제: 이 anonId의 기록 전체(삭제권).
app.delete("/api/results", (req, res) => {
  const { anonId } = req.query;
  if (!anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  const removed = deleteResults(anonId);
  return res.json({ removed });
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} (CORS: ${CORS_ORIGIN})`);
});
