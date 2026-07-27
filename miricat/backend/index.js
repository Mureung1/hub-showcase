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

// 경로 등록 저장: 화면 입력을 routes 테이블에 insert.
app.post('/api/routes', async (req, res) => {
  const { origin_name, dest_name, depart_time, lines, stops } = req.body ?? {};
  if (!origin_name || !dest_name) {
    return res.status(400).json({ error: 'origin_name과 dest_name은 필수입니다.' });
  }
  const name = `${origin_name} → ${dest_name}`;
  const { data, error } = await supabase
    .from('routes')
    .insert({ name, origin_name, dest_name, depart_time: depart_time ?? null, lines: lines ?? null, stops: stops ?? null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ route: data });
});

// 등록된 경로 목록 (최신순) — 저장 확인·화면 표시용.
app.get('/api/routes', async (req, res) => {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ routes: data });
});

// 경로 삭제: 주소의 :id 에 해당하는 행 삭제. (route_candidates는 FK cascade로 함께 삭제됨)
app.delete('/api/routes/:id', async (req, res) => {
  const { id } = req.params;                        // 주소에서 id 꺼냄 (req.body 아님!)
  const { error } = await supabase.from('routes').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();                            // 204 = 성공, 돌려줄 내용 없음
});

app.get('/api/notices/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
  .from('notices')
  .select("id, source, source_url, title, extraction, collected_at")
  .eq("id", id)
  .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json({ notice: data });
})

// 미리캣이 확인한 공지 목록 (최신순) — Python 에이전트가 notices에 저장한 추출 결과를 화면에 보여준다.
app.get('/api/notices', async (req, res) => {
  const { data, error } = await supabase
    .from('notices')
    .select('id, source, source_url, title, extraction, collected_at')
    .order('collected_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ notices: data });
});

const PORT = process.env.PORT || 8000; // Vite 프록시(/api → :8000)가 기대하는 포트
app.listen(PORT, () => console.log(`miricat api on :${PORT}`));
