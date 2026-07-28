import "dotenv/config";
import express from "express";
import cors from "cors";
import { saveResult, listResults, deleteResults, countAll, listAll, STORE_BACKEND } from "./store.js";
import { estimateMbtiFromChat, isLlmAvailable } from "./lib/llm.js";

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
// try/catch 필수: countAll()은 Supabase를 실제로 찌른다. Supabase가 휴면·중단이면 여기서 throw 되는데,
// Express 4는 async 핸들러의 rejection을 잡지 않아 그대로 프로세스가 종료된다(2026-07-27 Render
// "Exited with status 1" 장애의 원인 — 2026-07-28 재현 확인). Render가 주기적으로 찌르는 경로라 가장 먼저 터진다.
// 저장소가 죽었으면 프로세스를 죽이는 대신 503 degraded 로 알린다.
app.get("/api/health", async (_req, res) => {
  const base = { backend: STORE_BACKEND, time: new Date().toISOString() };
  try {
    return res.json({ status: "ok", ...base, storedCount: await countAll() });
  } catch (error) {
    // STORE_BACKEND 가 "supabase" 여도 실제 연결은 끊겨 있을 수 있다(store.js 폴백은 import 실패만 잡는다).
    // 배포 판정은 이 status 로 한다 — "supabase" 라는 이름값만으로 성공을 판단하지 않는다.
    console.error(`[health] 저장소 조회 실패: ${error.message}`);
    return res.status(503).json({ status: "degraded", ...base, storedCount: null, storeError: error.message });
  }
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

// 간이 MBTI 추정 채팅(ADR-008). 이 경로에 한해 동의한 사용자의 대화 원문을 외부 LLM에 보낸다.
// 중요: 대화 원문은 research store 에 저장하지 않는다(연구 저장 경로와 분리 — ADR-001 화이트리스트 불변).
// 키 없음/실패/타임아웃이면 available:false 또는 mbti:null 로 규칙 설문 폴백을 유도한다.
app.post("/api/mbti-chat", async (req, res) => {
  const body = req.body || {};
  if (!body.consent) {
    return res.status(400).json({ error: "consent_required" });
  }
  if (!isLlmAvailable) {
    // 키 미설정 — 기능 비활성. 프론트는 규칙 설문으로 폴백한다.
    return res.status(200).json({ available: false, mbti: null });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 12) : [];
  if (messages.length === 0) {
    return res.status(400).json({ error: "messages_required" });
  }
  // knownMbti(선택): 보충 모드 — 확정 유형은 유지하고 근거만 만든다(검증은 llm.js가 16유형 화이트리스트로).
  const knownMbti = typeof body.knownMbti === "string" ? body.knownMbti : "";
  try {
    const estimate = await estimateMbtiFromChat(messages, { knownMbti });
    if (!estimate) {
      // LLM 실패/계약위반 → 폴백 신호.
      return res.status(200).json({ available: true, mbti: null, fallback: true });
    }
    // "간이 추정" 계약: 공식 판정 아님. 대화 원문은 응답에도 되돌려 저장하지 않는다.
    // observedSignals는 원문이 아닌 파생 근거(지표 매핑)만 — 판정 보완용으로 프론트에 전달한다.
    return res.status(200).json({
      available: true,
      estimated: true,
      mbti: estimate.mbti,
      confidence: estimate.confidence,
      rationale: estimate.rationale,
      uncertainty: estimate.uncertainty,
      observedSignals: estimate.observedSignals ?? [],
    });
  } catch (error) {
    return res.status(200).json({ available: true, mbti: null, fallback: true, detail: error.message });
  }
});

// 없는 경로는 404 JSON 으로 답한다(HTML 스택트레이스가 새어나가지 않게).
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

// 전역 에러 미들웨어 — 위 라우트들이 놓친 예외를 여기서 500으로 마무리한다.
// eslint-disable-next-line no-unused-vars -- Express 4는 인자 4개여야 에러 미들웨어로 인식한다
app.use((error, _req, res, _next) => {
  console.error(`[error] ${error.message}`);
  res.status(500).json({ error: "internal_error" });
});

// 마지막 안전망. 무료 티어라 프로세스가 죽으면 자동 재시작이 없고 그대로 서비스 중단이 된다.
// 로그만 남기고 살려 둔다 — 죽은 서버보다 로그가 남는 서버가 낫다.
process.on("unhandledRejection", (reason) => {
  console.error(`[unhandledRejection] ${reason instanceof Error ? reason.stack : reason}`);
});
process.on("uncaughtException", (error) => {
  console.error(`[uncaughtException] ${error.stack ?? error.message}`);
});

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} (CORS: ${CORS_ORIGIN})`);
});
