// ── 우리 서버의 시작 파일 ──

// 1. .env 파일의 값들을 불러오기 (제일 먼저!)
require("dotenv").config();

// 2. Express 불러오기
const express = require("express");
const app = express();
// CORS 허용: 프론트(5173)에서 오는 요청을 받아준다
const cors = require("cors");
app.use(cors());
const PORT = 3001;
// 요청 몸통(body)에 담긴 JSON을 읽을 수 있게 설정
app.use(express.json());

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
// ── POST /api/expenses : 지출 항목 하나를 받아 DB에 저장 ──
app.post("/api/expenses", async (req, res) => {
  // 1. 프론트가 보낸 데이터를 꺼낸다 (body에서)
  const { name, amount, due_day } = req.body;

  // 2. Supabase의 expenses 테이블에 넣는다
  const { data, error } = await supabase
    .from("expenses")
    .insert([{ name, amount, due_day }])
    .select(); // 방금 넣은 걸 돌려받기

  // 3. 결과에 따라 응답
  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.status(201).send({ 저장됨: data });
  }
});
// ── GET /api/expenses : 저장된 지출 항목 목록을 불러오기 ──
app.get("/api/expenses", async (req, res) => {
  // expenses 테이블 전체를 최신순으로 조회
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false }); // 최신이 위로

  if (error) {
    res.status(500).send({ 에러: error.message });
  } else {
    res.send(data); // 목록을 그대로 응답
  }
});
// 6. 서버 켜기
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});