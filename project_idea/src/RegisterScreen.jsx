import { useState } from "react";
import { API_BASE } from "./apiBase";

const SCHOOL_HUBS = ["정문", "북문"];
const CITY_HUBS = ["대구역", "동대구역", "동성로", "대구공항", "서부정류장", "반월당"];
const ARRIVAL_OPTIONS = ["5분 이내", "10분 이내", "15분 이내"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function selectStyle() {
  return {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(36,21,18,0.12)",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#241512",
    background: "#fff",
    boxSizing: "border-box",
  };
}
const STORAGE_KEY = "ridesplit_last_route";

function loadSavedRoute() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function chipStyle(selected) {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: selected ? "none" : "1px solid rgba(36,21,18,0.12)",
    background: selected ? "#C8102E" : "#fff",
    color: selected ? "#fff" : "#241512",
    cursor: "pointer",
  };
}

function RegisterScreen({ userId, existingRegistration, onContinue, onSubmit }) {
  const saved = loadSavedRoute();
  const [direction, setDirection] = useState(saved?.direction ?? "from_school");
  const [departureHub, setDepartureHub] = useState(saved?.departureHub ?? "정문");
  const [destHub, setDestHub] = useState(saved?.destHub ?? "대구역");
  const [time, setTime] = useState(saved?.time ?? "20:00");
  const [arrival, setArrival] = useState(saved?.arrival ?? ARRIVAL_OPTIONS[0]);
  const [genderOnly, setGenderOnly] = useState(saved?.genderOnly ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const departureOptions = direction === "from_school" ? SCHOOL_HUBS : CITY_HUBS;
  const destOptions = direction === "from_school" ? CITY_HUBS : SCHOOL_HUBS;
  const [hour, minute] = time.split(":");

  function updateTime(nextHour, nextMinute) {
    setTime(`${nextHour}:${nextMinute}`);
  }

  function switchDirection(next) {
    setDirection(next);
    setDepartureHub(next === "from_school" ? SCHOOL_HUBS[0] : CITY_HUBS[0]);
    setDestHub(next === "from_school" ? CITY_HUBS[0] : SCHOOL_HUBS[0]);
  }

  async function handleSubmit() {
    const data = { direction, departureHub, destHub, time, arrival, genderOnly, userId };
    setSaving(true); // 버튼을 누르면 상태가 바뀌고 리렌더링
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: "POST", // 어떤 요청인가
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("서버가 저장을 거부했어요");
      const savedRow = await res.json();
      console.log("저장된 요청:", savedRow);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      onSubmit({ ...data, id: savedRow.id });
    } catch (e) {
      setError("저장에 실패했어요. 서버가 켜져 있는지 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      {existingRegistration && onContinue && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FCE4E2",
            borderRadius: 14,
            padding: "12px 16px",
            margin: "14px 0 0",
          }}
        >
          <span style={{ fontSize: 12, color: "#8C0E22", fontWeight: 600 }}>이미 등록한 이동이 있어요</span>
          <button
            onClick={onContinue}
            className="btn-primary"
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              background: "#C8102E",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            다음
          </button>
        </div>
      )}

      <h1 style={{ fontSize: 20, fontWeight: 800, margin: existingRegistration ? "14px 0 4px" : "40px 0 4px" }}>오늘의 이동을 등록해요</h1>
      <p style={{ fontSize: 13, color: "#8A7A76", margin: "0 0 20px", lineHeight: 1.5 }}>
        비슷한 시간, 비슷한 방향으로 가는
        <br />
        동행자를 찾아드릴게요
      </p>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>이동 방향</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...chipStyle(direction === "from_school"), flex: 1 }} onClick={() => switchDirection("from_school")}>
            학교 → 거점
          </button>
          <button style={{ ...chipStyle(direction === "to_school"), flex: 1 }} onClick={() => switchDirection("to_school")}>
            거점 → 학교
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>출발 · {departureHub}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {departureOptions.map((hub) => (
            <button key={hub} style={chipStyle(departureHub === hub)} onClick={() => setDepartureHub(hub)}>
              {hub}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>목적지 · {destHub}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {destOptions.map((hub) => (
            <button key={hub} style={chipStyle(destHub === hub)} onClick={() => setDestHub(hub)}>
              {hub}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>희망 출발 시간</div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={hour} onChange={(e) => updateTime(e.target.value, minute)} style={selectStyle()}>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
          <select value={minute} onChange={(e) => updateTime(hour, e.target.value)} style={selectStyle()}>
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: 11, color: "#8A7A76", margin: "6px 0 0" }}>
          이 시간 앞뒤 10분 이내로 등록한 학생을 찾아드려요
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7A76", marginBottom: 8 }}>도착 소요시간</div>
        <div style={{ display: "flex", gap: 8 }}>
          {ARRIVAL_OPTIONS.map((a) => (
            <button key={a} style={chipStyle(arrival === a)} onClick={() => setArrival(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          border: "1px solid rgba(36,21,18,0.08)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>동성끼리만 매칭</span>
        <button
          onClick={() => setGenderOnly(!genderOnly)}
          style={{
            width: 40,
            height: 24,
            borderRadius: 999,
            border: "none",
            background: genderOnly ? "#C8102E" : "rgba(36,21,18,0.15)",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: genderOnly ? 19 : 3,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 8px", textAlign: "center" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="btn-primary"
        style={{
          width: "100%",
          padding: 15,
          background: "#C8102E",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "저장 중..." : "등록하기"}
      </button>
    </div>
  );
}

export default RegisterScreen;
