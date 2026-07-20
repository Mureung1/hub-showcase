import { useState, useEffect } from "react";

const AVATAR_COLORS = ["#C8102E", "#2F8F5B", "#C98A1F", "#5B6472"];

function formatTime(t) {
  return t ? t.slice(0, 5) : "";
}

function CandidateListScreen({ myRequest, onBack, onJoin }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedId, setJoinedId] = useState(null);

  useEffect(() => {
    if (!myRequest) return;

    const params = new URLSearchParams({
      departureHub: myRequest.departureHub,
      destHub: myRequest.destHub,
      time: myRequest.time,
    });

    fetch(`http://localhost:4000/api/requests?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("후보를 불러오지 못했어요");
        return res.json();
      })
      .then((rows) => {
        setCandidates(rows.filter((r) => r.id !== myRequest.id));
      })
      .catch(() => setError("후보를 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요."))
      .finally(() => setLoading(false));
  }, [myRequest]);

  function handleClick(c) {
    if (joinedId !== null) return;
    setJoinedId(c.id);
    onJoin(c);
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <button
        onClick={onBack}
        style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0", cursor: "pointer" }}
      >
        ‹ 이전
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>매칭 후보</h1>
      <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 16px" }}>
        같은 방향 · 희망 시간 ±15분 이내로 조회된 실제 등록 데이터예요
      </p>

      {loading && <p style={{ fontSize: 13, color: "#8A7A76", textAlign: "center", margin: "40px 0" }}>불러오는 중...</p>}

      {error && <p style={{ fontSize: 13, color: "#C8102E", textAlign: "center", margin: "40px 0" }}>{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <p style={{ fontSize: 13, color: "#8A7A76", textAlign: "center", margin: "40px 0" }}>
          아직 같은 방향·시간대에 등록한 학생이 없어요
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {candidates.map((c, i) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid rgba(36,21,18,0.08)",
              borderRadius: 14,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ?
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>동행 대기 중인 학생</div>
              <div style={{ fontSize: 12, color: "#8A7A76" }}>
                {c.destination_hub_name} · {formatTime(c.desired_time)} 출발
              </div>
              <div style={{ fontSize: 12, color: "#8A7A76" }}>도착 소요시간 {c.arrival_estimate}</div>
            </div>
            <button
              className="btn-primary"
              onClick={() => handleClick(c)}
              disabled={joinedId !== null}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: joinedId === c.id ? "none" : "1px solid #C8102E",
                background: joinedId === c.id ? "#2F8F5B" : "transparent",
                color: joinedId === c.id ? "#fff" : joinedId !== null ? "#8A7A76" : "#C8102E",
                cursor: joinedId !== null ? "default" : "pointer",
              }}
            >
              {joinedId === c.id ? "채팅방 보기" : joinedId !== null ? "참여 불가" : "신청"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CandidateListScreen;
