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
    origin: ["http://localhost:5173", "http://localhost:5174"],
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