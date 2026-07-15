import { useState } from "react";

function Stars({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onChange(n)}
          style={{ cursor: "pointer", fontSize: 20, color: n <= value ? "#C98A1F" : "rgba(36,21,18,0.15)" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function RatingScreen({ candidate, onFinish }) {
  const [rating, setRating] = useState(0);
  const [noshow, setNoshow] = useState(false);

  return (
    <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "14px 0 20px" }}>이동이 끝났어요</h1>

      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(36,21,18,0.08)",
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>{candidate?.name ?? "동행자"}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stars value={rating} onChange={setRating} />
          <label style={{ fontSize: 12, color: "#8A7A76", display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={noshow} onChange={(e) => setNoshow(e.target.checked)} />
            노쇼 신고하기
          </label>
        </div>
      </div>

      <button
        onClick={onFinish}
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
          marginTop: "auto",
        }}
      >
        완료
      </button>
    </div>
  );
}

export default RatingScreen;
