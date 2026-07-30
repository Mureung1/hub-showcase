// 공지 ↔ 경로 매칭 규칙 — agent-worker/analyst.py · frontend/src/lib/matching.js 와 미러.
// (같은 규칙 3벌 유지 중 — 한쪽 고치면 셋 다. 데모 주간의 인지된 기술부채)

const norm = (s) => (s || '').toLowerCase().replace(/노선/g, '').replace(/[\s번]/g, '');

const hit = (value, token) => {
  const a = norm(value), b = norm(token);
  if (!a || !b) return false;
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return a === b;   // 숫자 노선은 정확일치만 ("46"⊂"462" 오탐 방지)
  return a === b || a.includes(b) || b.includes(a);
};

const DATE_RE = /(\d{4})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})/;
const MD_RE = /(\d{1,2})[.\-]\s*(\d{1,2})/;

function eventEnd(period) {
  const tail = (period || '').split('~').pop().trim();
  let y, mo, d;
  const m = tail.match(DATE_RE);
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else {
    const md = tail.match(MD_RE);
    const start = (period || '').match(DATE_RE);
    if (!md || !start) return null;
    [y, mo, d] = [+start[1], +md[1], +md[2]];
  }
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isCurrent(period) {
  if (!period) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = eventEnd(period);
  if (end) return end >= today;
  // 종료일 없이 시행일만("5.13부터~") → 시행 후 14일까지만 '새 소식' (옛 시간표 변경 경보 방지)
  const m = (period || '').match(DATE_RE);
  if (m) {
    const start = new Date(+m[1], +m[2] - 1, +m[3]);
    return (today - start) / 86400000 <= 14;
  }
  return true;
}

// ── 지역 게이팅: 공지 소스의 관할과 경로 좌표가 겹칠 때만 매칭 (타지역 오탐 방지) ──
const REGIONS = {
  daejeon_sejong: { minX: 127.15, maxX: 127.65, minY: 36.10, maxY: 36.75 },
  sudogwon: { minX: 126.35, maxX: 127.85, minY: 36.85, maxY: 38.35 },
  busan: { minX: 128.60, maxX: 129.40, minY: 34.95, maxY: 35.50 },
  gwangju: { minX: 126.55, maxX: 127.10, minY: 34.95, maxY: 35.40 },
  jeju: { minX: 126.10, maxX: 127.00, minY: 33.10, maxY: 33.60 },
  daegu: { minX: 128.30, maxX: 128.80, minY: 35.60, maxY: 36.05 },
};
const SOURCE_REGION = {
  daejeon_bus: 'daejeon_sejong', daejeon_city: 'daejeon_sejong', sejong_sctc: 'daejeon_sejong',
  seoul_topis: 'sudogwon', gbis_route: 'sudogwon',
  busan_bims: 'busan',
  gwangju_bus: 'gwangju',
  jeju_bus: 'jeju',
  daegu_bus: 'daegu',
};
function sameRegion(route, sourceId) {
  const region = REGIONS[SOURCE_REGION[sourceId]];
  const points = route?.path ?? [];
  if (!region || !points.length) return true;
  return points.some((p) => p.x >= region.minX && p.x <= region.maxX && p.y >= region.minY && p.y <= region.maxY);
}

// route = DB 행(lines/stops/roads 콤마 문자열) → 이 공지와 겹친 값들의 Set
function matchNotice(notice, route) {
  if (!sameRegion(route, notice.source)) return new Set();   // 관할 밖 공지는 매칭 자체를 안 함
  const tokens = [route.lines, route.stops]
    .filter(Boolean).flatMap((s) => s.split(',').map((t) => t.trim())).filter(Boolean);
  const roads = (route.roads || '').split(',').map((t) => t.trim()).filter(Boolean);
  const hits = new Set();
  for (const ev of notice.extraction?.events ?? []) {
    if (!isCurrent(ev.period)) continue;
    for (const v of [...(ev.affected_lines || []), ...(ev.affected_stops || [])]) {
      for (const t of tokens) if (hit(v, t)) hits.add(v);
    }
    const hay = norm(`${ev.location || ''} ${ev.event_name || ''}`);
    for (const r of roads) {
      const nr = norm(r);
      if (nr && hay.includes(nr)) hits.add(r);
    }
    // 4층: 반경 — 사건 좌표(ITS 돌발 등)가 내 경로에서 300m 이내인가
    if (ev.x && ev.y && route?.path?.length && nearRoute(ev.x, ev.y, route.path)) {
      hits.add(ev.event_name || '경로 인근 사건');
    }
  }
  return hits;
}

// 사건 좌표가 경로 좌표열의 어느 점에서든 radius_m 안이면 true (등장방형 근사 거리)
function nearRoute(x, y, path, radiusM = 300) {
  const cosLat = Math.cos((y * Math.PI) / 180);
  return path.some((p) => {
    const dx = (x - p.x) * 111320 * cosLat;
    const dy = (y - p.y) * 110540;
    return dx * dx + dy * dy <= radiusM * radiusM;
  });
}

module.exports = { norm, hit, isCurrent, matchNotice };
