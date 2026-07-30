import { api } from "../lib/api";
import { addMyRoute } from "../lib/myRoutes";
import { useState } from "react";
import Field from "./Field";
import StationPicker from "./StationPicker";
import RouteOption from "./RouteOption";
import InvestOverlay from "./InvestOverlay";

// 경로 등록: 출발/도착을 고르면 미리캣이 실제 경로 후보를 찾아온다.
// 대중교통은 노선·정류장, 자가용은 경유 도로명이 저장돼 이후 공지 매칭의 근거가 된다.
export default function RouteRegister({ onSaved }) {
  const [mode, setMode] = useState("transit");        // transit | driving
  const [origin, setOrigin] = useState(null);         // 정류장 객체 {name,x,y,region}
  const [dest, setDest] = useState(null);
  const [departTime, setDepartTime] = useState("");
  const [webhook, setWebhook] = useState("");         // 내 디스코드 웹훅 (선택) — 알림 받을 채널
  const [candidates, setCandidates] = useState(null); // null=조회 전
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [finding, setFinding] = useState(false);
  const [saved, setSaved] = useState(null);
  const [investCheck, setInvestCheck] = useState(null);   // 조사 연출 중이면 check 결과를 담는다 (null=연출 안 함)
  const [formKey, setFormKey] = useState(0);   // 저장 후 픽커를 통째로 리마운트(검색 잔상 제거)

  // 출발/도착/이동수단이 바뀌면 이전 후보는 무효 — 파생 데이터는 원본과 함께 비운다
  function pickOrigin(s) { setOrigin(s); setCandidates(null); }
  function pickDest(s) { setDest(s); setCandidates(null); }
  function switchMode(m) { setMode(m); setCandidates(null); }

  async function findCandidates() {
    if (!origin || !dest || finding) return;
    setFinding(true);
    try {
      const res = await fetch(
        api(`/api/route-candidates?mode=${mode}&sx=${origin.x}&sy=${origin.y}&ex=${dest.x}&ey=${dest.y}`)
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
        lines: chosen.lines.join(", "),          // 매칭 1층 재료 (대중교통)
        stops: chosen.stops.join(", "),          // 매칭 2층 재료 (대중교통)
        roads: (chosen.roads ?? []).join(", "),  // 매칭 3층 재료 (자가용)
        path: chosen.points ?? null,             // 좌표열 — 리포트 실지도용
        webhook_url: webhook.trim() || null,     // 개인 알림 채널 (선택)
      }),
    });
    const data = await res.json();
    if (res.ok) {
      addMyRoute(data.route.id);   // 이 브라우저의 "내 경로"로 기억
      onSaved?.();   // 저장 성공 → 부모에게 알려 목록 자동 갱신
      // 조사 연출을 먼저 띄운다. check 결과는 연출이 끝난 뒤 오버레이가 공개하고,
      // "확인"을 누르면 investComplete가 기존 저장 결과 화면으로 넘긴다.
      setInvestCheck({ route: data.route, check: data.check });
    } else {
      setSaved({ error: data.error ?? "저장 실패" });
    }
  }

  // 조사 연출 종료 → 실제 저장 결과를 확정하고 폼 초기화
  function investComplete() {
    const { route, check } = investCheck;
    setSaved({ ...route, check });
    setInvestCheck(null);
    setOrigin(null); setDest(null); setDepartTime(""); setCandidates(null);
    setFormKey((k) => k + 1);   // 픽커 리마운트로 검색 잔상 제거
  }

  const stationLabel = mode === "driving" ? "(가까운 정류장 기준)" : "정류장";

  // 조사 연출 중이면 폼 대신 오버레이만 보여준다 (등록 흐름의 클라이맥스)
  if (investCheck) {
    return (
      <div className="reg-side">
        <InvestOverlay check={investCheck.check} onDone={investComplete} />
      </div>
    );
  }

  return (
    <div className="reg-side">
      {/* 이동수단 선택 — 후보 조회 API와 저장되는 매칭 재료가 달라진다 */}
      <div className="mode-toggle">
        <button className={mode === "transit" ? "on" : ""} onClick={() => switchMode("transit")}>🚌 대중교통</button>
        <button className={mode === "driving" ? "on" : ""} onClick={() => switchMode("driving")}>🚗 자가용</button>
      </div>

      <StationPicker key={`o${formKey}`} label={`출발 ${stationLabel}`} station={origin} onSelect={pickOrigin} />
      <StationPicker key={`d${formKey}`} label={`도착 ${stationLabel}`} station={dest} onSelect={pickDest} />
      <Field label="시간대" value={departTime} onChange={(e) => setDepartTime(e.target.value)} placeholder="예: 08:00" />
      <Field
        label="내 디스코드로 알림 받기 (선택)"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="디스코드 채널 설정 → 연동 → 웹훅 URL 붙여넣기"
      />

      {origin && dest && candidates === null && (
        <button className="btn-primary" onClick={findCandidates}>
          {finding ? "미리캣이 길을 찾는 중…" : "경로 후보 찾기"}
        </button>
      )}

      {candidates && (
        <>
          <div className="opt-label">
            {candidates.length === 0
              ? "두 지점 사이의 경로를 찾지 못했어요."
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
        : (
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <p style={{ color: "#5B8A5A" }}>✅ 저장됨: {saved.name}</p>
            {/* 즉시 첫 점검 결과 — 경보 / 이상 없음 / 관할 밖 3분기 */}
            {saved.check?.alertCount > 0 && (
              <p style={{ color: "#E4572E", fontWeight: 600 }}>
                🚨 지금 영향 주는 공지를 찾았어요{saved.check.notified ? " — 디스코드로 첫 경보를 보냈어요!" : "."}
              </p>
            )}
            {saved.check && saved.check.alertCount === 0 && saved.check.covered && (
              <p style={{ color: "#8B7863" }}>
                🔎 모아둔 공지 {saved.check.checked}건과 대조 — 영향 없음{saved.check.notified ? ". 디스코드로 첫 보고를 보냈어요." : "이에요."}
              </p>
            )}
            {saved.check && !saved.check.covered && (
              <p style={{ color: "#C98A00" }}>
                📍 도로 돌발상황은 전국을 확인해요. 다만 이 지역 버스 게시판은 아직 감시 전이에요 (현재 서울·인천·경기·대전·세종·대구·울산·광주·부산·창원·전주·제주).
              </p>
            )}
          </div>
        ))}
    </div>
  );
}
