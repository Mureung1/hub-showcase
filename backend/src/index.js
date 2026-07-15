import "dotenv/config";
import express from "express";
import cors from "cors";
import { saveResult, listResults, deleteResults, countAll, listAll, STORE_BACKEND } from "./store.js";

const app = express();
const PORT = process.env.PORT || 3001;
// 쉼표로 여러 origin 허용. 기본은 로컬 개발용 localhost·127.0.0.1(5173).
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173";
const ALLOWED_ORIGINS = CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // origin 없음(같은 출처·curl 등) 또는 허용 목록에 있으면 통과.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);
app.use(express.json({ limit: "16kb" }));

// 표준 헬스체크 — 서버가 살아있는지 확인(의료 아님).
app.get("/api/health", async (_req, res) => {
  res.json({ status: "ok", backend: STORE_BACKEND, storedCount: await countAll(), time: new Date().toISOString() });
});

// 연구용 비식별 필드만 허용한다. 이름·자유응답·PII는 저장하지 않는다.
// task/state(context) 필드는 §8 스키마의 context에 해당 — 비식별 범주값이라 허용한다.
const ALLOWED_FIELDS = [
  "anonId",
  "mbti",
  "temperament",
  "matchedMethods",
  "baselineMethods",
  "taskType",
  "deadline",
  "availableMinutes",
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

// 저장: 동의(consent) + anonId 필수. 비식별 요약만 수용. 저장소는 sync/async 모두 await.
app.post("/api/results", async (req, res) => {
  const body = req.body || {};
  if (!body.consent) {
    return res.status(400).json({ error: "consent_required" });
  }
  if (!body.anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  try {
    const record = await saveResult(pickAllowed(body));
    return res.status(201).json(record);
  } catch (error) {
    return res.status(502).json({ error: "store_failed", detail: error.message });
  }
});

// 조회: 이 anonId의 기록만.
app.get("/api/results", async (req, res) => {
  const { anonId } = req.query;
  if (!anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  try {
    return res.json(await listResults(anonId));
  } catch (error) {
    return res.status(502).json({ error: "store_failed", detail: error.message });
  }
});

// 삭제: 이 anonId의 기록 전체(삭제권).
app.delete("/api/results", async (req, res) => {
  const { anonId } = req.query;
  if (!anonId) {
    return res.status(400).json({ error: "anonId_required" });
  }
  try {
    const removed = await deleteResults(anonId);
    return res.json({ removed });
  } catch (error) {
    return res.status(502).json({ error: "store_failed", detail: error.message });
  }
});

// 데이터 에이전트(c): 수집된 비식별 결과를 집계·분석해서 돌려준다. 개인 레코드는 노출하지 않는다.
function analyze(records) {
  const total = records.length;
  const methodFrequency = {};
  const temperamentDistribution = {};
  let matchedDiffersCount = 0;
  let calibrationSum = 0;
  let calibrationN = 0;
  let fitSum = 0;
  let fitN = 0;

  for (const r of records) {
    (r.matchedMethods ?? []).forEach((m) => {
      methodFrequency[m] = (methodFrequency[m] ?? 0) + 1;
    });
    if (r.temperament) {
      temperamentDistribution[r.temperament] = (temperamentDistribution[r.temperament] ?? 0) + 1;
    }
    const matched = (r.matchedMethods ?? []).join("|");
    const baseline = (r.baselineMethods ?? []).join("|");
    if (matched && baseline && matched !== baseline) {
      matchedDiffersCount += 1;
    }
    if (typeof r.calibrationError === "number") {
      calibrationSum += r.calibrationError;
      calibrationN += 1;
    }
    if (typeof r.fitScore === "number" && r.fitScore > 0) {
      fitSum += r.fitScore;
      fitN += 1;
    }
  }

  return {
    total,
    methodFrequency,
    temperamentDistribution,
    matchedDiffersFromBaselineRate: total ? matchedDiffersCount / total : 0,
    avgCalibrationError: calibrationN ? calibrationSum / calibrationN : null,
    avgFitScore: fitN ? fitSum / fitN : null,
    calibrationN,
    fitN,
  };
}

app.get("/api/analysis", async (_req, res) => {
  try {
    return res.json(analyze(await listAll()));
  } catch (error) {
    return res.status(502).json({ error: "store_failed", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} (CORS: ${CORS_ORIGIN})`);
});
