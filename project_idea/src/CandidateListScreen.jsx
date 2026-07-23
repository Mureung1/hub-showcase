import { useState, useEffect } from "react";
import TaxiLoader from "./TaxiLoader";

const AVATAR_COLORS = ["#C8102E", "#2F8F5B", "#C98A1F", "#5B6472"];

function formatTime(t) {
  return t ? t.slice(0, 5) : "";
}

function CandidateListScreen({ myRequest, onBack, onJoin }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinedId, setJoinedId] = useState(null);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    if (!myRequest) return;

    const params = new URLSearchParams({
      departureHub: myRequest.departureHub,
      destHub: myRequest.destHub,
      time: myRequest.time,
      myRequestId: myRequest.id,
    });

    fetch(`http://localhost:4000/api/requests?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("후보를 불러오지 못했어요");
        return res.json();
      })
      .then((rows) => {
        setCandidates(rows.filter((r) => !r.memberIds.includes(myRequest.id)));
      })
      .catch(() => setError("후보를 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요."))
      .finally(() => setLoading(false));
  }, [myRequest]);

  useEffect(() => {
    if (!myRequest) return;

    function sendHeartbeat() {
      fetch(`http://localhost:4000/api/requests/${myRequest.id}/heartbeat`, { method: "POST" }).catch(() => {});
    }

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [myRequest]);

  async function handleStartNew() {
    if (joinedId !== null) return;
    setJoinError(null);

    try {
      const res = await fetch(`http://localhost:4000/api/requests/${myRequest.id}/create-room`, {
        method: "POST",
      });
      const body = await res.json();

      if (!res.ok) {
        setJoinError(body.error ?? "방 만들기에 실패했어요.");
        return;
      }

      setJoinedId(myRequest.id);
      onJoin({
        groupId: body.groupId,
        groupCount: 1,
        myRequestId: myRequest.id,
        pending: false,
      });
    } catch {
      setJoinError("방 만들기에 실패했어요. 서버가 켜져 있는지 확인해주세요.");
    }
  }

  async function handleClick(c) {
    if (joinedId !== null) return;
    setJoinError(null);

    try {
      const res = await fetch(`http://localhost:4000/api/requests/${c.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myRequestId: myRequest.id }),
      });
      const body = await res.json();

      if (!res.ok) {
        setJoinError(body.error ?? "신청에 실패했어요.");
        return;
      }

      setJoinedId(c.id);
      onJoin({
        ...c,
        groupId: body.groupId,
        groupCount: body.groupCount,
        myRequestId: myRequest.id,
        pending: body.pending,
      });
    } catch {
      setJoinError("신청에 실패했어요. 서버가 켜져 있는지 확인해주세요.");
    }
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

      {loading && <TaxiLoader label="후보를 찾는 중..." />}

      {error && <p style={{ fontSize: 13, color: "#C8102E", textAlign: "center", margin: "40px 0" }}>{error}</p>}

      {joinError && <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 10px" }}>{joinError}</p>}

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
              <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                동행 대기 중인 학생
                {c.activity?.isActive && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2F8F5B", display: "inline-block" }} />
                )}
              </div>
              <div style={{ fontSize: 12, color: "#8A7A76" }}>
                {c.destination_hub_name} · {formatTime(c.desired_time)} 출발
              </div>
              <div style={{ fontSize: 12, color: "#8A7A76" }}>도착 소요시간 {c.arrival_estimate}</div>
              {c.activity && (
                <div style={{ fontSize: 11, color: c.activity.isActive ? "#2F8F5B" : "#8A7A76" }}>{c.activity.label}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: c.groupCount >= 2 ? "#FCE4E2" : "rgba(36,21,18,0.06)",
                  color: c.groupCount >= 2 ? "#8C0E22" : "#8A7A76",
                }}
              >
                {c.groupCount}/4
              </span>
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
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 10px" }}>
          마음에 드는 방이 없다면, 직접 새로 만들어서 다른 사람을 기다릴 수 있어요
        </p>
        <button
          onClick={handleStartNew}
          disabled={joinedId !== null}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            border: "1px solid #C8102E",
            background: joinedId === myRequest.id ? "#2F8F5B" : "transparent",
            color: joinedId === myRequest.id ? "#fff" : joinedId !== null ? "#8A7A76" : "#C8102E",
            cursor: joinedId !== null ? "default" : "pointer",
          }}
        >
          {joinedId === myRequest.id ? "채팅방 보기" : "새로 방 만들기"}
        </button>
      </div>
    </div>
  );
}

export default CandidateListScreen;
