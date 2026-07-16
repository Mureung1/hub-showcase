import { useState } from "react";

const MESSAGES = [
  { fromMe: false, text: "안녕하세요! 같이 타요 :)", time: "오후 8:41" },
  { fromMe: true, text: "네 반가워요! 정문 앞에서 만날까요?", time: "오후 8:42" },
  { fromMe: false, text: "좋아요, 그 시간에 뵐게요", time: "오후 8:43" },
];

const AVATAR_COLORS = ["#C8102E", "#2F8F5B", "#C98A1F", "#5B6472"];

function GroupChatScreen({ candidate, onComplete }) {
  const [confirmed, setConfirmed] = useState(false);

  const count = candidate?.groupCount ?? 1;
  const isFull = count >= 4;
  const canBoard = isFull || confirmed;
  const cost = Math.round(12000 / count / 100) * 100;

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
        <div style={{ display: "flex" }}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                border: "2px solid #FBF5F1",
                marginLeft: i === 0 ? 0 : -10,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            background: isFull ? "#E6F5EC" : "#FCE4E2",
            color: isFull ? "#2F8F5B" : "#8C0E22",
          }}
        >
          {count}/4명 모임
        </span>
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>
        {isFull || confirmed ? "그룹이 확정됐어요" : "동행자를 모으는 중이에요"}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {MESSAGES.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.fromMe ? "flex-end" : "flex-start" }}>
            <div
              style={{
                background: m.fromMe ? "#C8102E" : "#EFE7E3",
                color: m.fromMe ? "#fff" : "#241512",
                padding: "8px 14px",
                borderRadius: 16,
                fontSize: 13,
                maxWidth: "75%",
                textAlign: "left",
              }}
            >
              {m.text}
            </div>
            <span style={{ fontSize: 10, color: "#8A7A76", margin: "2px 4px 0" }}>{m.time}</span>
          </div>
        ))}
      </div>

      {!isFull && !confirmed && (
        <div style={{ background: "#FCE4E2", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>정원이 다 차지 않았어요</p>
          <button
            onClick={() => setConfirmed(true)}
            className="btn-primary"
            style={{
              width: "100%",
              padding: 12,
              background: "#C8102E",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            동의하고 출발 확정
          </button>
        </div>
      )}

      {canBoard && (
        <div style={{ border: "1px solid #C8102E", borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#8A7A76", margin: "0 0 4px" }}>예상 요금 (1인당)</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#C8102E", margin: 0 }}>{cost.toLocaleString()}원</p>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={!canBoard}
        className="btn-primary"
        style={{
          width: "100%",
          padding: 15,
          borderRadius: 999,
          fontSize: 15,
          fontWeight: 700,
          border: "none",
          cursor: canBoard ? "pointer" : "default",
          background: canBoard ? "#C8102E" : "#EFE7E3",
          color: canBoard ? "#fff" : "#8A7A76",
          marginTop: "auto",
        }}
      >
        탑승 확인
      </button>
    </div>
  );
}

export default GroupChatScreen;
