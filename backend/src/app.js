import express from "express";
import cors from "cors";
import database from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      // 허용할 출처 목록
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        // Vercel Frontend URL (와일드카드 사용으로 모든 Vercel 앱 허용)
      ];

      // 환경변수로 특정 Vercel URL 추가 가능
      if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
      }

      // 개발/테스트 환경에서는 모든 출처 허용
      // 프로덕션에서는 위의 allowedOrigins만 사용하도록 수정
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notices", analysisRoutes);
app.use("/api/events", eventsRoutes);

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "CalMe 백엔드 연결 성공",
  });
});







export default app;