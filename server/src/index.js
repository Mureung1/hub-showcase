import "dotenv/config";
import express from "express";
import cors from "cors";
import searchRouter from "./routes/search.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 라우트는 여기부터 추가 (예: app.use("/api/chat", chatRouter))
app.use("/api/search", searchRouter);

// 공통 에러 응답 포맷: { error: { message } }
app.use((req, res) => {
  res.status(404).json({ error: { message: "요청한 API를 찾을 수 없습니다." } });
});

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
