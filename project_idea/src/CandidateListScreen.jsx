import { useState } from "react";

const CANDIDATES = [
  { id: 1, name: "민준", college: "경영학과", gender: "male", rating: 4.8, dest: "대구역", time: "20:55", diff: "5분 차이", groupCount: 2 },
  { id: 2, name: "서연", college: "심리학과", gender: "female", rating: 4.9, dest: "대구역", time: "21:00", diff: "정확히 일치", groupCount: 1 },
  { id: 3, name: "지훈", college: "컴퓨터공학과", gender: "male", rating: 4.6, dest: "동대구역", time: "21:05", diff: "5분 차이", groupCount: 4 },
];

const AVATAR_COLORS = ["#C8102E", "#2F8F5B", "#C98A1F", "#5B6472"];

function CandidateListScreen({ genderOnly, onBack, onJoin }) {
  const [joinedId, setJoinedId] = useState(null);

  const visible = CANDIDATES
    .filter((c) => !genderOnly || c.gender === "female")
    .sort((a, b) => a.time.localeCompare(b.time));

  function statusFor(c) {
    if (joinedId === c.id) return { label: "채팅방 보기", disabled: false, color: "#2F8F5B" };
    if (joinedId !== null) return { label: "참여 불가", disabled: true };
    if (c.groupCount >= 4) return { label: "정원 마감", disabled: true };
    return { label: "신청", disabled: false };
  }

  function handleClick(c) {
    if (statusFor(c).disabled) return;
    setJoinedId(c.id);
    onJoin({ ...c, groupCount: Math.min(c.groupCount + 1, 4) });
  }

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <button
        onClick={onBack}
        style={{ alignSelf: "flex-start", border: "none", background: "none", color: "#8A7A76", fontSize: 13, padding: "14px 0", cursor: "pointer" }}
      >
        ‹ 이전
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>매칭 후보</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((c, i) => {
          const status = statusFor(c);
          return (
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
                {c.name[0]}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name} · ★{c.rating}</div>
                <div style={{ fontSize: 12, color: "#8A7A76" }}>{c.college} · {c.gender === "male" ? "남" : "여"}</div>
                <div style={{ fontSize: 12, color: "#8A7A76" }}>{c.dest} · {c.time} 출발 · {c.diff}</div>
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
                  onClick={() => handleClick(c)}
                  disabled={status.disabled}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    border: status.color ? "none" : "1px solid #C8102E",
                    background: status.color || "transparent",
                    color: status.color ? "#fff" : status.disabled ? "#8A7A76" : "#C8102E",
                    cursor: status.disabled ? "default" : "pointer",
                  }}
                >
                  {status.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CandidateListScreen;
