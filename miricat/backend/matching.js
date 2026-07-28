// 공지 ↔ 경로 매칭 규칙 — agent-worker/analyst.py · frontend/src/lib/matching.js 와 미러.
// (같은 규칙 3벌 유지 중 — 한쪽 고치면 셋 다. 데모 주간의 인지된 기술부채)

const norm = (s) => (s || '').toLowerCase().replace(/노선/g, '').replace(/[\s번]/g, '');

const hit = (value, token) => {
  const a = norm(value), b = norm(token);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
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
  const end = eventEnd(period);
  if (!end) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return end >= today;
}

// route = DB 행(lines/stops/roads 콤마 문자열) → 이 공지와 겹친 값들의 Set
function matchNotice(notice, route) {
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
  }
  return hits;
}

module.exports = { norm, hit, isCurrent, matchNotice };
