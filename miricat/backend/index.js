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
  const { origin_name, dest_name, depart_time, lines, stops, roads, path } = req.body ?? {};
  if (!origin_name || !dest_name) {
    return res.status(400).json({ error: 'origin_name과 dest_name은 필수입니다.' });
  }
  const name = `${origin_name} → ${dest_name}`;
  const { data, error } = await supabase
    .from('routes')
    .insert({ name, origin_name, dest_name, depart_time: depart_time ?? null, lines: lines ?? null, stops: stops ?? null, roads: roads ?? null, path: path ?? null })
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

// ── ODsay 프록시 ──────────────────────────────────────────────
// API 키를 브라우저에 노출하면 안 되므로(F12로 훔쳐감) 서버가 대신 호출한다.
// 응답도 프론트가 쓰기 좋은 모양으로 다듬는다 — ODsay 원본 구조가 바뀌어도 프론트는 무사.
const ODSAY_BASE = 'https://api.odsay.com/v1/api';

function odsayError(data) {
  // ODsay는 실패 시 { error: {...} } 또는 { error: [{...}] } 형태 — 방어적으로 메시지만 뽑는다
  if (!data.error) return null;
  const e = Array.isArray(data.error) ? data.error[0] : data.error;
  return e?.msg ?? e?.message ?? 'ODsay 오류';
}

// 정류장 검색: 이름 일부 → 정류장 후보 (경로 등록에서 출발/도착 선택용)
app.get('/api/stations', async (req, res) => {
  const q = (req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ error: '검색어(q)가 필요합니다.' });
  const url = `${ODSAY_BASE}/searchStation?apiKey=${encodeURIComponent(process.env.ODSAY_API_KEY)}`
    + `&stationName=${encodeURIComponent(q)}&stationClass=1`;   // stationClass=1 = 버스 정류장
  const r = await fetch(url);
  const data = await r.json();
  const err = odsayError(data);
  if (err) return res.status(502).json({ error: err });        // 502 = 우리 잘못 아니고 위쪽(ODsay) 문제
  // 같은 이름 정류장이 승강장별로 여러 행(건너편·방면) — 경로 탐색엔 어느 승강장이든
  // 결과가 사실상 같으므로(도보 포함 최적화) 이름+지역 기준 대표 1개만 남긴다.
  const seen = new Set();
  const stations = [];
  for (const s of data.result?.station ?? []) {
    const region = [s.do, s.gu].filter(Boolean).join(' ');
    const key = `${s.stationName}|${region}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stations.push({
      name: s.stationName,
      x: s.x,                                // 경도(lng)
      y: s.y,                                // 위도(lat)
      arsID: s.arsID,                        // 정류장 고유번호 (버스 안내판에 붙은 그 번호)
      region,                                // "대전광역시 유성구" — 동명 정류장 구분용
    });
    if (stations.length >= 8) break;
  }
  res.json({ stations });
});

// 경로 후보 조회: 출발/도착 좌표 → 후보 목록. mode=transit(기본, ODsay) / driving(NCP Directions).
// 대중교통은 노선·정류장(매칭 1·2층), 자가용은 경유 도로명(매칭 3층)이 판정 근거가 된다.
app.get('/api/route-candidates', async (req, res) => {
  const { sx, sy, ex, ey, mode } = req.query;
  if (!sx || !sy || !ex || !ey) {
    return res.status(400).json({ error: '출발/도착 좌표(sx, sy, ex, ey)가 필요합니다.' });
  }

  if (mode === 'driving') {
    // NCP Directions — 최적(traoptimal)·빠른길(trafast) 두 옵션을 후보로
    const url = `https://maps.apigw.ntruss.com/map-direction/v1/driving`
      + `?start=${sx},${sy}&goal=${ex},${ey}&option=traoptimal:trafast`;
    const r = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': process.env.NAVER_MAP_CLIENT_ID,
        'x-ncp-apigw-api-key': process.env.NAVER_MAP_CLIENT_SECRET,
      },
    });
    const data = await r.json();
    if (data.code !== 0) return res.status(502).json({ error: data.message ?? 'Directions 오류' });
    const seen = new Set();
    const candidates = [];
    for (const key of ['traoptimal', 'trafast']) {
      for (const opt of data.route?.[key] ?? []) {
        const roads = [...new Set((opt.section ?? []).map((s) => s.name).filter(Boolean))];
        const sig = roads.join('|');
        if (seen.has(sig)) continue;         // 두 옵션이 같은 길이면 하나만
        seen.add(sig);
        // 좌표열: 실지도 폴리라인용. 원본은 수백 점이라 ~60점으로 솎아낸다(표시용으론 충분)
        const raw = opt.path ?? [];
        const step = Math.max(1, Math.ceil(raw.length / 60));
        const points = raw.filter((_, i) => i % step === 0 || i === raw.length - 1)
          .map(([x, y]) => ({ x, y }));
        candidates.push({
          mode: 'driving',
          totalTime: Math.round((opt.summary?.duration ?? 0) / 60000),  // ms → 분
          distanceKm: Math.round((opt.summary?.distance ?? 0) / 100) / 10,
          roads,                             // 경유 도로명 (매칭 3층 재료)
          lines: [], stops: [],
          points,
        });
      }
    }
    return res.json({ candidates });
  }

  const url = `${ODSAY_BASE}/searchPubTransPathT?apiKey=${encodeURIComponent(process.env.ODSAY_API_KEY)}`
    + `&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}`;
  const r = await fetch(url);
  const data = await r.json();
  const err = odsayError(data);
  if (err) return res.status(502).json({ error: err });
  // path[] → subPath[](구간) → lane[](그 구간에서 탈 수 있는 노선들) 3중 구조를 평탄화
  const candidates = (data.result?.path ?? []).slice(0, 5).map((p) => {
    const lines = [];   // 매칭 1층 재료 (버스 번호 + 지하철 호선)
    const stops = [];   // 매칭 2층 재료 (승하차 정류장 — 전체 경유 정류장은 아님, 한계 인지)
    const points = [];  // 경유 정류장 좌표열 (실지도 폴리라인·마커용)
    for (const sp of p.subPath ?? []) {
      if (sp.trafficType === 2) {                       // 2 = 버스 구간
        for (const l of sp.lane ?? []) lines.push(l.busNo);
        if (sp.startName) stops.push(sp.startName);
        if (sp.endName) stops.push(sp.endName);
      } else if (sp.trafficType === 1) {                // 1 = 지하철 구간
        for (const l of sp.lane ?? []) lines.push(l.name);
        if (sp.startName) stops.push(sp.startName);
        if (sp.endName) stops.push(sp.endName);
      }                                                 // 3 = 도보 → 매칭에 안 쓰니 버림
      for (const st of sp.passStopList?.stations ?? []) {
        points.push({ name: st.stationName, x: Number(st.x), y: Number(st.y) });
      }
    }
    return {
      mode: 'transit',
      totalTime: p.info?.totalTime ?? null,             // 분
      transitCount: (p.info?.busTransitCount ?? 0) + (p.info?.subwayTransitCount ?? 0),
      stationCount: p.info?.busStationCount ?? null,
      lines: [...new Set(lines)],                       // 같은 노선 중복 제거
      stops: [...new Set(stops)],
      points,
    };
  });
  res.json({ candidates });
});

// 진단용: 이 서버가 바깥으로 나갈 때 쓰는 공인 IP (ODsay IP 등록 대조용)
app.get('/api/debug/egress-ip', async (req, res) => {
  const r = await fetch('https://ifconfig.me', { headers: { 'User-Agent': 'curl' } });
  res.json({ egressIp: (await r.text()).trim() });
});

const PORT = process.env.PORT || 8000; // Vite 프록시(/api → :8000)가 기대하는 포트
app.listen(PORT, () => console.log(`miricat api on :${PORT}`));
