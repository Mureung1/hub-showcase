import "dotenv/config";
import express from "express";
import cors from "cors";
import priorityRouter from "./routes/priority.js";
import subjectsRouter from "./routes/subjects.js";

const app = express();
const PORT = process.env.PORT || 3001;

// 이 서비스의 화면이 올라가 있는 주소. 우리가 배포한 곳이므로 항상 허용한다.
// 주소를 하나 더 붙일 때마다 대시보드에 들어가야 하면 빠뜨리기 쉬워서, 아는 주소는 코드에 둔다.
const OWN_ORIGINS = [
  "https://what-first.vercel.app",
  "https://exam-priority-calculator.vercel.app",
];

// 그 밖에 허용할 주소는 CORS_ORIGIN 으로 받는다. 여러 개면 쉼표로 구분한다.
// (배포 후에 도메인이 늘어나도 코드를 고치지 않고 열어줄 수 있는 통로다.)
const extraOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [...new Set([...OWN_ORIGINS, ...extraOrigins])];

// 로컬 개발(CORS_ORIGIN 미설정)에서는 localhost 포트가 매번 달라 목록으로 막기 어렵다.
// 배포에서는 NODE_ENV 가 production 이므로 목록만 허용한다.
const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: isProduction || extraOrigins.length > 0 ? allowedOrigins : true,
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
    isProduction || extraOrigins.length > 0
      ? `CORS: 허용 오리진 ${allowedOrigins.join(", ")}`
      : "CORS: 모든 오리진 허용 (로컬 개발용)"
  );
});
