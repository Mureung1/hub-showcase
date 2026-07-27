import { api } from "../lib/api";
import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { SOURCE_LABEL, matchNotice, routeTokens, isCurrent } from "../lib/matching";
import ReportMap from "../components/report/ReportMap";
import AltVerdict from "../components/report/AltVerdict";
import TraceList from "../components/report/TraceList";

// 헤드라인으로 보여줄 사건: "아직 유효하면서 내 경로와 겹친" 사건 우선.
// (같은 사건이 날짜별로 여러 항목일 수 있어, 끝난 항목을 잘못 집으면 문구가 모순된다)
function pickEvent(notice, hits) {
  const events = notice.extraction?.events ?? [];
  const hitsIn = (ev) =>
    [...(ev.affected_lines || []), ...(ev.affected_stops || [])].some((v) => hits.has(v));
  return (
    events.find((ev) => isCurrent(ev.period) && hitsIn(ev)) ??
    events.find(hitsIn) ??
    events.find((ev) => isCurrent(ev.period)) ??
    events[0] ?? null
  );
}

// 브리핑 리포트: 디스코드 경보 링크(/report/:noticeId)로 진입하는 데모 클라이맥스 화면
export default function ReportPage() {
  const { noticeId } = useParams();
  const [searchParams] = useSearchParams();      // ?route=<id> — 홈에서 어떤 경로 기준으로 넘어왔나
  const [notice, setNotice] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound

  useEffect(() => {
    let cancelled = false;   // 언마운트/재실행 후 도착한 응답이 화면을 덮지 않게
    async function load() {
      const [nRes, rRes] = await Promise.all([
        fetch(api(`/api/notices/${noticeId}`)),
        fetch(api("/api/routes")),
      ]);
      if (cancelled) return;
      if (!nRes.ok) { setStatus("notfound"); return; }
      const n = await nRes.json();
      const r = await rRes.json();
      setNotice(n.notice);
      setRoutes(r.routes ?? []);
      setStatus("ok");
    }
    load();
    return () => { cancelled = true; };
  }, [noticeId]);

  if (status === "loading") return <p style={{ color: "#8B7863" }}>미리캣이 리포트를 준비하는 중…</p>;
  if (status === "notfound") {
    return (
      <div style={{ marginTop: 24 }}>
        <p>이 공지는 찾을 수 없어요. 링크가 오래됐을 수 있어요.</p>
        <Link to="/" style={{ color: "#3E7CB1" }}>← 홈으로</Link>
      </div>
    );
  }

  // ── 판정 (전부 렌더 중 계산 — 원본은 notice/routes뿐, 나머지는 파생값) ──
  const queryRoute = routes.find((r) => r.id === searchParams.get("route"));
  const currentRoute =
    queryRoute ??
    routes.find((r) => matchNotice(notice, routeTokens(r)).size > 0) ??  // 링크 직진입: 영향받는 경로부터
    routes[0] ?? null;
  const hits = matchNotice(notice, routeTokens(currentRoute));
  const affected = hits.size > 0;
  const event = pickEvent(notice, hits);
  const ended = !!event && !isCurrent(event.period);   // 끝난 사건 → "영향 없음"의 이유가 다르다

  // 간이 대안 재매칭: 다른 등록 경로 중 이 공지에 안 걸리는 첫 경로 (MIRI-25의 맛보기)
  const others = currentRoute ? routes.filter((r) => r.id !== currentRoute.id) : [];
  const altRoute = affected
    ? others.find((r) => matchNotice(notice, routeTokens(r)).size === 0) ?? null
    : null;

  return (
    <div>
      <Link to="/" style={{ fontSize: 13, color: "#8B7863", textDecoration: "none" }}>← 홈으로</Link>
      <h2 style={{ fontSize: 20, margin: "10px 0 4px" }}>미리캣이 알려드려요 — 자세히</h2>
      <p style={{ fontSize: 13, color: "#8B7863", marginBottom: 16 }}>
        {currentRoute ? <><b>{currentRoute.name}</b> 기준으로 살펴봤어요.</> : "등록된 경로가 없어 공지 내용만 보여드려요."}
      </p>

      <div className="report">
        <ReportMap
          affected={affected}
          originName={currentRoute?.origin_name}
          destName={currentRoute?.dest_name}
          eventLabel={event?.location || event?.event_name}
          showAlt={!!altRoute}
        />

        <div className="report-side">
          {/* 무슨 일이 있나요 — 경보(빨강) / 영향 없음(초록) */}
          <div className={`rp-block ${affected ? "alert" : "clear"}`}>
            <div className="rp-kicker">무슨 일이 있나요?</div>
            {event ? (
              <>
                <h4>{event.event_name}</h4>
                <div className="sub">
                  {[event.period, SOURCE_LABEL[notice.source] ?? notice.source].filter(Boolean).join(" · ")}
                </div>
                {!affected && (
                  <div className="sub">
                    {ended
                      ? "이미 끝난 일이에요 — 지금 이동에는 영향이 없어요."
                      : "이 경로와 겹치지 않아요 — 확인만 해두세요."}
                  </div>
                )}
              </>
            ) : (
              <>
                <h4>{notice.title}</h4>
                <div className="sub">이 공지에서는 통제·우회 사건을 찾지 못했어요.</div>
              </>
            )}
          </div>

          {affected && <AltVerdict altRoute={altRoute} others={others} hits={hits} />}

          <TraceList notice={notice} currentRoute={currentRoute} hits={hits} event={event} />

          <a className="rp-link" href={notice.source_url} target="_blank" rel="noreferrer">
            공지 원문 보기 →
          </a>
        </div>
      </div>
    </div>
  );
}
