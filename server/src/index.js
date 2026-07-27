import "dotenv/config";
import express from "express";
import cors from "cors";
import searchRouter from "./routes/search.js";
import commandsRouter from "./routes/commandsRouter.js";
import scenariosRouter from "./routes/scenariosRouter.js";

const app = express();

// 로컬 개발 중 Vite는 포트가 막혀 있으면 5173→5174→5175...로 자동으로 옮겨간다.
// 그때마다 CORS_ORIGIN에 포트를 하나씩 나열(하드코딩)해야 하는 구조는 피하고, 대신
// "localhost의 어떤 포트든" 정규식으로 허용한다 — 로컬 개발에서만 의미 있는 완화이며,
// 실제 배포 도메인은 포트가 고정이라 이 문제 자체가 없다.
// CORS_ORIGIN은 그 배포된 FE 주소(콤마로 여러 개 가능) 전용으로 남겨둔다.
const isLocalhostOrigin = (origin) => /^http:\/\/localhost:\d+$/.test(origin);
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? [];

app.use(cors({
  origin(origin, callback) {
    // origin이 없는 요청(서버-투-서버, curl 등)은 그대로 허용
    if (!origin || isLocalhostOrigin(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS로 차단된 origin입니다.'));
  },
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 라우트는 여기부터 추가 (예: app.use("/api/chat", chatRouter))
app.use("/api/search", searchRouter);
app.use("/api/commands", commandsRouter);
app.use("/api/scenarios", scenariosRouter);

// 공통 에러 응답 포맷: { error: { message } }
app.use((req, res) => {
  res.status(404).json({ error: { message: "요청한 API를 찾을 수 없습니다." } });
});

// Express는 콜백의 인자 개수(4개)로 에러 핸들러를 구분하므로, next를 안 쓰더라도
// 시그니처에서 빼면 안 된다(빼면 일반 미들웨어로 오인됨).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: { message: err.message || "서버 오류가 발생했습니다." },
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`c-dict server listening on port ${port}`);
});
