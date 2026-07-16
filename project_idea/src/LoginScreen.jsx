import { useState } from "react";   // react에서 핵심인 usestate

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("jieun@univ.ac.kr");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        textAlign: "center",
        padding: "0 28px 40px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: "#C8102E",
          margin: "40px auto 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
          <circle cx="8" cy="10" r="6" fill="#fff" opacity="0.9" />
          <circle cx="15" cy="10" r="6" fill="#fff" opacity="0.55" />
          <circle cx="17.5" cy="17.5" r="5.5" fill="#fff" />
          <text x="17.5" y="20.3" fontSize="7" fontWeight="800" textAnchor="middle" fill="#8C0E22">
            ₩
          </text>
        </svg>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "20px 0 6px" }}>
        학교 이메일로 로그인
      </h1>
      <p style={{ fontSize: 13, color: "#8A7A76", lineHeight: 1.5 }}>
        대학교 학생만 이용할 수 있는
        <br />
        택시 동승 매칭 서비스예요
      </p>

      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(36,21,18,0.08)",
          borderRadius: 16,
          padding: 16,
          textAlign: "left",
          margin: "14px 0",
        }}
      >
        <div style={{ fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
          학교 이메일
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontSize: 15, fontWeight: 600, border: "none", outline: "none", flex: 1 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#8C0E22",
              background: "#FCE4E2",
              padding: "4px 8px",
              borderRadius: 999,
            }}
          >
            .ac.kr 인증
          </span>
        </div>
      </div>

      <button
        onClick={onLogin}
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
          cursor: "pointer",
        }}
      >
        인증 메일 받기
      </button>
    </div>
  );
}

export default LoginScreen;