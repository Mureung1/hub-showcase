import "dotenv/config";
import express from "express";
import cors from "cors";
import searchRouter from "./routes/search.js";
import commandsRouter from "./routes/commandsRouter.js";
import scenariosRouter from "./routes/scenariosRouter.js";

const app = express();

// CORS_ORIGIN은 콤마로 여러 개 지정 가능 (예: Vite가 5173이 사용 중이면 5174로 자동 넘어가는 경우 대비).
// trim()으로 콤마 뒤 공백까지 안전하게 처리.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins }));
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
