import { api } from "../lib/api";
import { useState } from "react";
import Field from "./Field";
import StationPicker from "./StationPicker";
import RouteOption from "./RouteOption";

// 경로 등록: 정류장 검색으로 출발/도착을 고르면 미리캣이 실제 대중교통 후보를 찾아온다.
// 고른 후보의 노선/정류장이 저장돼 이후 공지 매칭의 근거가 된다.
export default function RouteRegister({ onSaved }) {
  const [origin, setOrigin] = useState(null);        // 정류장 객체 {name,x,y,region}
  const [dest, setDest] = useState(null);
  const [departTime, setDepartTime] = useState("");
  const [candidates, setCandidates] = useState(null); // null=조회 전
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [finding, setFinding] = useState(false);
  const [saved, setSaved] = useState(null);

  // 출발/도착을 바꾸면 이전 후보는 무효 — 파생 데이터는 원본이 바뀔 때 함께 비운다
  function pickOrigin(s) { setOrigin(s); setCandidates(null); }
  function pickDest(s) { setDest(s); setCandidates(null); }

  async function findCandidates() {
    if (!origin || !dest || finding) return;
    setFinding(true);
    try {
      const res = await fetch(
        api(`/api/route-candidates?sx=${origin.x}&sy=${origin.y}&ex=${dest.x}&ey=${dest.y}`)
      );
      const data = await res.json();
      setCandidates(data.candidates ?? []);
      setSelectedIdx(0);
    } finally {
      setFinding(false);
    }
  }

  async function handleSubmit() {
    const chosen = candidates?.[selectedIdx];
    if (!chosen) return;
    const res = await fetch(api("/api/routes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_name: origin.name,
        dest_name: dest.name,
        depart_time: departTime,
        lines: chosen.lines.join(", "),   // 매칭 1층 재료
        stops: chosen.stops.join(", "),   // 매칭 2층 재료 (승하차 정류장)
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaved(data.route);
      onSaved?.();   // 저장 성공 → 부모에게 알려 목록 자동 갱신
    } else {
      setSaved({ error: data.error ?? "저장 실패" });
    }
  }

  return (
    <div className="reg-side">
      <StationPicker label="출발 정류장" station={origin} onSelect={pickOrigin} />
      <StationPicker label="도착 정류장" station={dest} onSelect={pickDest} />
      <Field label="시간대" value={departTime} onChange={(e) => setDepartTime(e.target.value)} placeholder="예: 08:00" />

      {origin && dest && candidates === null && (
        <button className="btn-primary" onClick={findCandidates}>
          {finding ? "미리캣이 길을 찾는 중…" : "경로 후보 찾기"}
        </button>
      )}

      {candidates && (
        <>
          <div className="opt-label">
            {candidates.length === 0
              ? "이 두 정류장 사이의 대중교통 경로를 찾지 못했어요."
              : "경로 후보 — 평소 다니는 길을 고르세요"}
          </div>
          {candidates.map((candidate, i) => (
            <RouteOption
              key={i}
              candidate={candidate}
              selected={i === selectedIdx}
              onSelect={() => setSelectedIdx(i)}
            />
          ))}
          {candidates.length > 0 && (
            <button className="btn-primary" onClick={handleSubmit}>이 경로에 보초 세우기 →</button>
          )}
        </>
      )}

      {saved && (saved.error
        ? <p style={{ color: "#E4572E" }}>⚠️ {saved.error}</p>
        : <p style={{ color: "#5B8A5A" }}>✅ 저장됨: {saved.name}</p>)}
    </div>
  );
}
