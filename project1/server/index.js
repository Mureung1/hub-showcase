require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./lib/supabaseClient");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());

// 서버 자체가 잘 떠 있는지 확인용
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Supabase 연결이 실제로 되는지 확인용 (meetings 테이블 개수만 세어봄)
app.get("/health/db", async (req, res) => {
  const { count, error } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true });

  if (error) {
    return res.status(500).json({ connected: false, error: error.message });
  }
  res.json({ connected: true, meetingsCount: count });
});

app.use("/meetings", require("./routes/meetings"));

// 에러 처리 미들웨어 (다른 라우트 추가 시에도 공통으로 사용)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`오늘모여 서버 실행 중: http://localhost:${PORT}`);
});
