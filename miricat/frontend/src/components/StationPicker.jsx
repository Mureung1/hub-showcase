import { api } from "../lib/api";
import { useState } from "react";

// 정류장 검색 + 선택. 고른 정류장 객체({name,x,y,region})를 부모에게 올려보낸다.
// 검색은 버튼/엔터로만 실행 — 타이핑마다 쏘면 ODsay 일일 호출 제한을 갉아먹는다.
export default function StationPicker({ label, station, onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);   // null=검색 전, []=결과 없음
  const [searching, setSearching] = useState(false);

  async function search() {
    if (!q.trim() || searching) return;
    setSearching(true);
    try {
      const res = await fetch(api(`/api/stations?q=${encodeURIComponent(q)}`));
      const data = await res.json();
      setResults(data.stations ?? []);
    } finally {
      setSearching(false);
    }
  }

  // 이미 골랐으면: 선택 결과 + 다시 고르기
  if (station) {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="picked-station">
          <span>📍 <b>{station.name}</b> <small>{station.region}</small></span>
          <button type="button" onClick={() => { onSelect(null); setResults(null); }}>변경</button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") search(); }}
          placeholder="정류장 이름으로 검색 (예: 충남대)"
        />
        <button type="button" className="btn-search" onClick={search}>
          {searching ? "…" : "검색"}
        </button>
      </div>
      {results && (
        <div className="station-results">
          {results.length === 0 ? (
            <div className="station-empty">검색 결과가 없어요 — 정류장 이름으로 다시 시도해보세요.</div>
          ) : (
            results.map((s) => (
              <button key={`${s.arsID}-${s.x}`} type="button" onClick={() => onSelect(s)}>
                <b>{s.name}</b> <small>{s.region}{s.arsID ? ` · ${s.arsID}` : ""}</small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
