import express from "express";
import cors from "cors";
import database from "./config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/authRoutes.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "CalMe 백엔드 연결 성공",
  });
});




app.post("/api/notices", authMiddleware, (req, res) => {    // 공지 등록 요청 → authMiddleware가 JWT 검사 → 통과하면 공지 등록
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "제목과 본문을 모두 입력해주세요.",
    });
  }

  const insertNotice = database.prepare(`
    INSERT INTO notices (title, content)
    VALUES (?, ?)
  `);

  const result = insertNotice.run(title, content);

  const savedNotice = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({
    success: true,
    message: "공지 저장 성공",
    data: savedNotice,
  });
});

app.get("/api/notices", (req, res) => {
  const notices = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      ORDER BY id DESC
    `)
    .all();

  res.json({
    success: true,
    data: notices,
  });
});

export default app;