import "dotenv/config";
import express from "express";
import cors from "cors";
import priorityRouter from "./routes/priority.js";
import subjectsRouter from "./routes/subjects.js";

const app = express();
const PORT = process.env.PORT || 3001;

// 허용할 프론트엔드 주소. 배포(Render)에서는 CORS_ORIGIN 에 Vercel 주소를 넣는다.
// 여러 개면 쉼표로 구분한다. 예) https://a.vercel.app,https://b.vercel.app
// 값이 없으면(로컬 개발) 모든 오리진을 허용한다.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
  })
);
app.use(express.json());

// Render 대시보드에서 주소를 눌렀을 때 404 대신 서버가 살아있다는 걸 보여준다.
app.get("/", (req, res) => {
  res.json({ service: "exam-priority-server", health: "/api/health" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", priorityRouter);
app.use("/api", subjectsRouter);

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT} 에서 실행 중입니다.`);
  console.log(
    allowedOrigins.length === 0
      ? "CORS: 모든 오리진 허용 (CORS_ORIGIN 미설정 — 로컬 개발용)"
      : `CORS: 허용 오리진 ${allowedOrigins.join(", ")}`
  );
});
