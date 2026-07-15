import { useState } from "react";

const SCHOOL_HUBS = ["정문", "북문"];
const CITY_HUBS = ["대구역", "동대구역", "동성로", "대구공항", "서부정류장", "반월당", "기타"];
const TIME_OPTIONS = ["20:30", "21:00", "21:30"];
const ARRIVAL_OPTIONS = ["5분 이내", "10분 이내", "15분 이내"];

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

function RegisterScreen({ onBack, onSubmit }) {
  const [direction, setDirection] = useState("from_school");
  const [departureHub, setDepartureHub] = useState("정문");
  const [destHub, setDestHub] = useState("대구역");
  const [time, setTime] = useState(TIME_OPTIONS[0]);
  const [arrival, setArrival] = useState(ARRIVAL_OPTIONS[0]);
  const [genderOnly, setGenderOnly] = useState(false);

  const departureOptions = direction === "from_school" ? SCHOOL_HUBS : CITY_HUBS;
  const destOptions = direction === "from_school" ? CITY_HUBS : SCHOOL_HUBS;

  function switchDirection(next) {
    setDirection(next);
    setDepartureHub(next === "from_school" ? SCHOOL_HUBS[0] : CITY_HUBS[0]);
    setDestHub(next === "from_school" ? CITY_HUBS[0] : SCHOOL_HUBS[0]);
  }

  function handleSubmit() {
    onSubmit({ direction, departureHub, destHub, time, arrival, genderOnly });
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <button
        onClick={onBack}
        style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0", cursor: "pointer" }}
      >
        ‹ 이전
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "14px 0 4px" }}>오늘의 이동을 등록해요</h1>
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
          {TIME_OPTIONS.map((t) => (
            <button key={t} style={chipStyle(time === t)} onClick={() => setTime(t)}>
              {t}
            </button>
          ))}
        </div>
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

      <button
        onClick={handleSubmit}
        style={{
          width: "100%",
          padding: 15,
          background: "#C8102E",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        등록하기
      </button>
    </div>
  );
}

export default RegisterScreen;
