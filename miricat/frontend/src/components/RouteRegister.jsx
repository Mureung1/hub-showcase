import Field from "./Field";
import RouteOption from "./RouteOption";
import { useState } from "react";

export default function RouteRegister() {
    const [selectedId, setSelectedId] = useState("a"); const [origin, setOrigin] = useState(""); const [dest, setDest] = useState(""); const [departTime, setDepartTime] = useState("");
  const [saved, setSaved] = useState(null);
  const candidates = [
  { id: "a", name: "경로 A", durationMin: 43, lineBadge: "B1", road: "갑천도시고속도로", stationCount: 12 },
  { id: "b", name: "경로 B", durationMin: 51, lineBadge: "급행2", road: "한밭대로", stationCount: 15 },
];

  // "보초 세우기" 클릭 시: 입력값을 백엔드 POST /api/routes 로 보내 저장.
  async function handleSubmit() {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin_name: origin, dest_name: dest, depart_time: departTime }),
    });
    const data = await res.json();
    setSaved(res.ok ? data.route : { error: data.error ?? "저장 실패" });
  }

  return (
    <div className="reg-side">
      <Field label="출발지" value={origin}     onChange={(e) => setOrigin(e.target.value)}     placeholder="예: 유성구 우리집" />
      <Field label="도착지" value={dest}       onChange={(e) => setDest(e.target.value)}       placeholder="예: 대덕구 회사" />
      <Field label="시간대" value={departTime} onChange={(e) => setDepartTime(e.target.value)} placeholder="예: 08:00" />

      <div className="opt-label">경로 후보 — 평소 다니는 길을 고르세요</div>

      {candidates.map((candidate) => (<RouteOption key={candidate.id} candidate={candidate} selected={candidate.id === selectedId} onSelect={() => setSelectedId(candidate.id)} />))}

      <button className="btn-primary" onClick={handleSubmit}>이 경로에 보초 세우기 →</button>
      {saved && (saved.error
        ? <p style={{ color: "#E4572E" }}>⚠️ {saved.error}</p>
        : <p style={{ color: "#5B8A5A" }}>✅ 저장됨: {saved.name}</p>)}
    </div>
  );
}