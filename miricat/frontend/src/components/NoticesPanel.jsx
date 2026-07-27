import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SOURCE_LABEL, fmtDate, matchNotice, routeTokens } from "../lib/matching";

function Chips({ items, color, hits }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((t, i) => {
        const on = hits?.has(t);
        return (
          <span
            key={i}
            style={{
              fontSize: 12, fontWeight: on ? 700 : 600,
              color: on ? "#fff" : color,
              background: on ? color : color + "18",
              border: `1px solid ${color}${on ? "" : "55"}`,
              borderRadius: 6, padding: "1px 7px",
            }}
          >
            {t}
          </span>
        );
      })}
    </>
  );
}

function NoticeCard({ n, hits, alertMode, routeId }) {
  const events = n.extraction?.events ?? [];
  return (
    <div
      style={{
        border: "1px solid #ECE1CF",
        borderLeft: `4px solid ${alertMode ? "#E4572E" : "#5B8A5A"}`,
        borderRadius: 14, background: "#fff", padding: "14px 16px",
        opacity: alertMode ? 1 : 0.85,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#8B7863" }}>
          {SOURCE_LABEL[n.source] ?? n.source}
        </span>
        <span style={{ fontSize: 12, color: "#8B7863" }}>{fmtDate(n.collected_at)} 확인</span>
      </div>
      <div style={{ fontWeight: 600, color: "#33261A", margin: "4px 0 10px" }}>{n.title}</div>

      {events.length === 0 ? (
        <div style={{ fontSize: 13, color: "#5B8A5A" }}>✅ 추출된 사건 없음</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {events.map((ev, i) => (
            <div key={i} style={{ background: "#FBF6EE", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#33261A" }}>{ev.event_name}</div>
              {(ev.location || ev.period) && (
                <div style={{ fontSize: 13, color: "#8B7863", marginTop: 2 }}>
                  {[ev.location, ev.period].filter(Boolean).join(" · ")}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Chips items={ev.affected_lines} color="#3E7CB1" hits={hits} />
                <Chips items={ev.affected_stops} color="#E4572E" hits={hits} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
        {/* 리포트 = 앱 안 이동(Link) / 원문 = 외부 사이트(a) */}
        <Link
          to={`/report/${n.id}${routeId ? `?route=${routeId}` : ""}`}
          style={{ fontSize: 13, fontWeight: 600, color: "#3E7CB1", textDecoration: "none" }}
        >
          미리캣 리포트 보기 →
        </Link>
        <a
          href={n.source_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13, color: "#8B7863" }}
        >
          공지 원문 →
        </a>
      </div>
    </div>
  );
}

// 등록 경로를 골라, 그 경로에 영향 주는 공지를 미리캣이 대조해 보여준다.
export default function NoticesPanel({ routes = [] }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      setNotices(data.notices ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // 선택된 경로 (없으면 첫 경로)
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0] ?? null;
  const tokens = routeTokens(selected);

  // 선택 경로 기준으로 각 공지에 매칭 결과를 붙이고 경보/확인함으로 가른다
  const withHits = notices.map((n) => ({ n, hits: matchNotice(n, tokens) }));
  const alerts = withHits.filter((x) => x.hits.size > 0);
  const clears = withHits.filter((x) => x.hits.size === 0);

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>🐾 미리캣이 확인한 공지 ({notices.length})</h2>
        <button onClick={load}>{loading ? "확인 중…" : "새로고침"}</button>
      </div>

      {routes.length === 0 ? (
        <p style={{ color: "#8B7863" }}>먼저 위에서 경로를 등록하면, 그 경로에 영향 주는 공지를 골라 보여줄게요.</p>
      ) : (
        <>
          {/* 경로 선택기 — 어떤 등록 경로 기준으로 매칭할지 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {routes.map((r) => {
              const on = selected && r.id === selected.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    fontSize: 13, padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${on ? "#33261A" : "#ECE1CF"}`,
                    background: on ? "#33261A" : "#fff",
                    color: on ? "#fff" : "#33261A",
                  }}
                >
                  {r.name}{r.lines ? ` · ${r.lines}` : ""}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 13, color: "#8B7863", marginBottom: 16 }}>
            {tokens.length > 0 ? (
              <>🚌 <b>{selected.name}</b> 기준 · 이용 {tokens.join(", ")} · 미리캣이 대조해 판정</>
            ) : (
              <>⚠️ 이 경로엔 이용 노선 정보가 없어요. 경로를 등록할 때 후보(B1/급행2)를 골라 저장하면 매칭돼요.</>
            )}
          </div>

          {/* 경보: 선택 경로에 영향 주는 공지 */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E4572E", margin: "4px 0 8px" }}>
            🚨 이 경로 영향 경보 ({alerts.length})
          </div>
          {alerts.length === 0 ? (
            <p style={{ color: "#5B8A5A", fontSize: 14, margin: "0 0 8px" }}>
              ✅ 이 경로에 영향 주는 공지는 없어요.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {alerts.map(({ n, hits }) => <NoticeCard key={n.id} n={n} hits={hits} alertMode routeId={selected?.id} />)}
            </div>
          )}

          {/* 확인 보고: 영향 없는 나머지 (보초가 다 확인했다는 증거) */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "#8B7863", margin: "22px 0 8px" }}>
            확인함 · 이 경로 영향 없음 ({clears.length})
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {clears.map(({ n, hits }) => <NoticeCard key={n.id} n={n} hits={hits} alertMode={false} routeId={selected?.id} />)}
          </div>
        </>
      )}
    </div>
  );
}
