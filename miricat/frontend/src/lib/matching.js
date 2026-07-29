// 공지 ↔ 경로 매칭 규칙 모음.
// 홈(NoticesPanel)과 리포트 페이지가 같은 규칙으로 판정해야 하므로 한 곳에 둔다.
// agent-worker/analyst.py 와 미러 관계 — 한쪽을 고치면 반대쪽도 같이 고칠 것.

// 소스 id → 사람이 읽는 이름 (화면엔 개발용 id 대신 이 라벨)
export const SOURCE_LABEL = {
  daejeon_bus: "대전 버스조합",
  daejeon_city: "대전광역시",
  sejong_sctc: "세종교통공사",
};

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// ── 매칭 규칙: analyst.py 와 동일 (노선/정류장 문자열 겹침) ──
export function norm(s) {
  return (s || "").toLowerCase().replace(/노선/g, "").replace(/[\s번]/g, "");
}
export function hit(value, token) {
  const a = norm(value), b = norm(token);
  if (!a || !b) return false;
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return a === b;   // 숫자 노선은 정확일치만 ("46"⊂"462" 오탐 방지)
  return a === b || a.includes(b) || b.includes(a);
}

// ── 시간 유효성: analyst.py의 _is_current 미러 (끝난 사건은 경보 제외) ──
const DATE_RE = /(\d{4})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})/;
const MD_RE = /(\d{1,2})[.\-]\s*(\d{1,2})/;
export function eventEnd(period) {
  const tail = (period || "").split("~").pop().trim();   // '~' 뒤 = 종료쪽
  let y, mo, d;
  const m = tail.match(DATE_RE);
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else {
    const md = tail.match(MD_RE);           // 종료쪽이 'M.D'뿐이면 시작 연도 빌림
    const start = (period || "").match(DATE_RE);
    if (!md || !start) return null;         // 종료일 못 정함 (열린 기간 등)
    [y, mo, d] = [+start[1], +md[1], +md[2]];
  }
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
export function isCurrent(period) {
  if (!period) return true;
  const end = eventEnd(period);
  if (!end) return true;                    // 불명·열린 기간 → 보수적 유지
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return end >= today;                      // 아직 안 끝났으면 유효(다가올 것 포함)
}

// 경로 lines/stops/roads("B1, 급행2") → 토큰 배열 (표시·매칭 겸용)
export function routeTokens(route) {
  if (!route) return [];
  return [route.lines, route.stops, route.roads]
    .filter(Boolean)
    .flatMap((s) => s.split(",").map((t) => t.trim()))
    .filter(Boolean);
}

// 경로의 도로명만 (3층 매칭용)
export function roadTokens(route) {
  if (!route?.roads) return [];
  return route.roads.split(",").map((t) => t.trim()).filter(Boolean);
}

// ── 지역 게이팅: 공지 소스의 관할과 경로 좌표가 겹칠 때만 매칭 (타지역 오탐 방지) ──
const REGIONS = {
  daejeon_sejong: { minX: 127.15, maxX: 127.65, minY: 36.10, maxY: 36.75 },
  sudogwon: { minX: 126.35, maxX: 127.85, minY: 36.85, maxY: 38.35 },
};
const SOURCE_REGION = {
  daejeon_bus: "daejeon_sejong", daejeon_city: "daejeon_sejong", sejong_sctc: "daejeon_sejong",
  seoul_topis: "sudogwon", gbis_route: "sudogwon",
};
export function sameRegion(route, sourceId) {
  const region = REGIONS[SOURCE_REGION[sourceId]];
  const points = route?.path ?? [];
  if (!region || !points.length) return true;   // 좌표 없는 옛 경로·미지정 소스는 보수적으로 통과
  return points.some((p) => p.x >= region.minX && p.x <= region.maxX && p.y >= region.minY && p.y <= region.maxY);
}

// 이 공지가 내 경로와 겹치나 + 겹친 값들(강조용). analyst.py analyze와 미러.
export function matchNotice(notice, route) {
  if (!sameRegion(route, notice.source)) return new Set();   // 관할 밖 공지는 매칭 자체를 안 함
  const tokens = routeTokens(route);
  const roads = roadTokens(route);
  const hits = new Set();
  for (const ev of notice.extraction?.events ?? []) {
    if (!isCurrent(ev.period)) continue;   // 끝난 사건은 매칭에서 뺀다
    for (const v of [...(ev.affected_lines || []), ...(ev.affected_stops || [])]) {
      for (const t of tokens) if (hit(v, t)) hits.add(v);
    }
    // 3층: 도로명 — 공지의 위치 문구에 내 경유 도로가 등장하는가 (자가용)
    const hay = norm(`${ev.location || ""} ${ev.event_name || ""}`);
    for (const r of roads) {
      const nr = norm(r);
      if (nr && hay.includes(nr)) hits.add(r);
    }
  }
  return hits; // 비었으면 영향 없음
}
