// ── 우리 서버의 시작 파일 ──

// 1. .env 파일의 값들을 불러오기 (제일 먼저!)
require("dotenv").config();

// 2. Express 불러오기
const express = require("express");
const app = express();
const PORT = 3001;

// 3. Supabase 연결
//    .env에서 URL과 키를 꺼내와 Supabase 클라이언트를 만든다
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,   // .env의 SUPABASE_URL 값
  process.env.SUPABASE_KEY    // .env의 SUPABASE_KEY 값
);

// 4. 테스트용 응답
app.get("/", (req, res) => {
  res.send("홈키퍼 서버가 살아있어요! 🏠");
});

// 5. Supabase 연결 테스트
//    localhost:3001/test 로 접속하면 expenses 테이블을 조회해본다
app.get("/test", async (req, res) => {
  const { data, error } = await supabase.from("expenses").select("*");
  if (error) {
    res.send("연결 실패: " + error.message);
  } else {
    res.send({ 연결: "성공!", 데이터개수: data.length, 데이터: data });
  }
});

// 6. 서버 켜기
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});