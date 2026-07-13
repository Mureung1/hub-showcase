// 미리캣 API 서버 — Express + Supabase.
// backend/ 기준 ../.env = miricat/.env(루트)를 읽는다.
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 헬스체크: Express 살아있음 + Supabase 왕복 확인.
// routes 테이블 한 줄을 실제로 꺼내와 연결이 되는지 검증한다.
app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase.from('routes').select('*').limit(1);
  res.json({ ok: !error, data: data ?? null, error: error?.message ?? null });
});

const PORT = process.env.PORT || 8000; // Vite 프록시(/api → :8000)가 기대하는 포트
app.listen(PORT, () => console.log(`miricat api on :${PORT}`));
