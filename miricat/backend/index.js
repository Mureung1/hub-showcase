// 미리캣 API 서버 — Express + Supabase.
// backend/ 기준 ../.env = miricat/.env(루트)를 읽는다.
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { matchNotice } = require('./matching');

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

// ── 즉시 첫 점검 ─────────────────────────────────────────────
// 보초를 세우는 순간, 모아둔 공지들과 바로 대조해서 첫 보고를 보낸다.
// (크롤링·추출은 매일 아침 보초 몫 — 여기선 저장된 공지와의 결정론적 매칭만. LLM 없음 = 즉답)

// 감시 관할 — 수집 소스가 있는 지역의 대략적 좌표 상자. 경로가 하나도 안 걸치면 "관할 밖"을 정직하게 알린다.
const COVERAGE = [
  { name: '대전·세종권', minX: 127.15, maxX: 127.65, minY: 36.10, maxY: 36.75 },
  { name: '수도권', minX: 126.35, maxX: 127.85, minY: 36.85, maxY: 38.35 },
  { name: '부산권', minX: 128.60, maxX: 129.40, minY: 34.95, maxY: 35.50 },
];
const inCoverage = (points) =>
  !points?.length ||   // 좌표 없는 옛 경로는 보수적으로 관할 취급
  points.some((p) => COVERAGE.some((b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY));

async function instantCheck(route) {
  const { data: notices } = await supabase
    .from('notices')
    .select('id, source, title, source_url, extraction')   // source = 지역 게이팅용
    .order('collected_at', { ascending: false })
    .limit(150);                                           // ITS 돌발(수십 건)까지 포함해도 버스 공지가 밀리지 않게
  const alerts = [];
  for (const n of notices ?? []) {
    const hits = matchNotice(n, route);
    if (hits.size) alerts.push({ notice: n, hits: [...hits] });
  }
  return { covered: inCoverage(route.path), checked: (notices ?? []).length, alerts };
}

async function sendFirstReport(route, check) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return false;
  const reportBase = process.env.REPORT_BASE_URL ?? 'https://hub-pi-lime.vercel.app';
  const apiBase = process.env.API_BASE_URL ?? 'https://miricat-api.onrender.com';
  let payload;
  if (check.alerts.length) {
    const a = check.alerts[0];                       // 첫 점검은 가장 최근 영향 공지 하나만 무겁게
    payload = { embeds: [{
      title: `🚨 첫 점검 경보 — ${route.name}에 영향 공지`,
      url: `${reportBase}/report/${a.notice.id}?route=${route.id}`,
      color: 0xE4572E,
      description: (a.notice.title ?? '').trim(),
      fields: [
        { name: '겹친 것', value: a.hits.join(', ') },
        { name: '원문 공지', value: a.notice.source_url },
      ],
      image: { url: `${apiBase}/api/routes/${route.id}/map.png?hits=${encodeURIComponent(a.hits.join(','))}` },
      footer: { text: '보초를 세우자마자 모아둔 공지와 대조한 결과예요' },
    }] };
  } else if (check.covered) {
    payload = { content: `🐾 새 보초 — **${route.name}** 등록. 모아둔 공지 ${check.checked}건과 대조했고, 지금 영향 주는 공지는 없어요.` };
  } else {
    payload = { content: `🐾 새 보초 — **${route.name}** 등록. 도로 돌발상황은 전국을 확인하지만, 이 지역 버스 게시판은 아직 감시 전이에요 (현재 서울·경기·대전·세종·부산).` };
  }
  const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.ok;   // 화면이 "보냈어요"를 사실일 때만 말하게
}

// 경로 등록 저장: 화면 입력을 routes 테이블에 insert + 즉시 첫 점검.
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

  // 즉시 첫 점검 — 실패해도 등록 자체는 성공으로 (점검은 부가 서비스)
  let check = null;
  let notified = false;
  try {
    check = await instantCheck(data);
    notified = await sendFirstReport(data, check);
  } catch (e) {
    console.error('즉시 점검 실패:', e.message);
  }
  res.status(201).json({
    route: data,
    check: check && { covered: check.covered, checked: check.checked, alertCount: check.alerts.length, notified },
  });
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

// 보초 상태 — "살아있는 서비스"의 증거. 마지막 순찰 시각·보관 공지 수·감시 게시판 수.
app.get('/api/status', async (req, res) => {
  const { data, error } = await supabase
    .from('notices')
    .select('source, collected_at')
    .order('collected_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({
    lastPatrol: data[0]?.collected_at ?? null,        // 가장 최근 수집 시각 = 마지막 순찰
    noticeCount: data.length,
    sourceCount: new Set(data.map((n) => n.source)).size,
  });
});

// 미리캣이 확인한 공지 목록 (최신순) — Python 에이전트가 notices에 저장한 추출 결과를 화면에 보여준다.
app.get('/api/notices', async (req, res) => {
  const { data, error } = await supabase
    .from('notices')
    .select('id, source, source_url, title, extraction, collected_at')
    .neq('source', 'its_incident')   // 도로 돌발(수십 건)은 목록에서 제외 — 경보·리포트로만 드러남
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

// 경로 지도 이미지 (NCP Static Map 프록시) — 디스코드 embed 이미지용.
// Static Map은 경로선(폴리라인) 미지원 → 출발·도착 + 영향 정류장(hits, 빨강) 마커로 표현.
// NCP는 인증 헤더가 필요해 디스코드가 직접 못 불러온다 → 우리가 받아서 이미지를 흘려준다.
const _norm = (s) => (s || '').toLowerCase().replace(/노선/g, '').replace(/[\s번]/g, ''); // matching.js 미러
app.get('/api/routes/:id/map.png', async (req, res) => {
  const { data: route, error } = await supabase
    .from('routes').select('path').eq('id', req.params.id).single();
  const points = route?.path;
  if (error || !points?.length) return res.status(404).json({ error: '경로 좌표가 없습니다.' });

  // 화면 채우기: 좌표들의 중심 + 범위(span)에서 줌 레벨을 어림한다
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.3, 0.005);
  const level = Math.max(7, Math.min(16, Math.floor(Math.log2(360 / span)) + 1));

  // 마커: 공지와 겹친 정류장(빨강, hits=쉼표목록) 우선 + 출발(초록)·도착(파랑)
  // 영향 정류장이 출발/도착과 같은 자리면 빨강만 그린다 (겹치면 가려짐)
  const hits = (req.query.hits ?? '').split(',').map(_norm).filter(Boolean);
  const isHit = (p) => p.name && hits.some((h) => h && (_norm(p.name).includes(h) || h.includes(_norm(p.name))));
  const redPts = points.filter(isHit);
  const markers = [];
  if (!isHit(points[0])) markers.push(`type:d|size:mid|color:green|pos:${points[0].x} ${points[0].y}`);
  if (!isHit(points[points.length - 1])) markers.push(`type:d|size:mid|color:blue|pos:${points[points.length - 1].x} ${points[points.length - 1].y}`);
  for (const p of redPts) markers.push(`type:d|size:mid|color:red|pos:${p.x} ${p.y}`);

  const url = `https://maps.apigw.ntruss.com/map-static/v2/raster`
    + `?w=800&h=420&scale=2&format=png&center=${cx},${cy}&level=${level}`
    + markers.map((m) => `&markers=${encodeURIComponent(m)}`).join('');
  const r = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': process.env.NAVER_MAP_CLIENT_ID,
      'x-ncp-apigw-api-key': process.env.NAVER_MAP_CLIENT_SECRET,
    },
  });
  if (!r.ok) return res.status(502).json({ error: `Static Map 오류 (${r.status})` });
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(Buffer.from(await r.arrayBuffer()));
});

// 진단용: 이 서버가 바깥으로 나갈 때 쓰는 공인 IP (ODsay IP 등록 대조용)
app.get('/api/debug/egress-ip', async (req, res) => {
  const r = await fetch('https://ifconfig.me', { headers: { 'User-Agent': 'curl' } });
  res.json({ egressIp: (await r.text()).trim() });
});

const PORT = process.env.PORT || 8000; // Vite 프록시(/api → :8000)가 기대하는 포트
app.listen(PORT, () => console.log(`miricat api on :${PORT}`));
