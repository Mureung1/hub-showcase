"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * 가입은 3단계다: 코드 받기 → 코드 확인 → 비밀번호 설정.
 * 한 화면에 다 두지 않고 단계를 나눠, 지금 뭘 해야 하는지가 항상 하나만 보이게 한다.
 */
export default function SignupForm() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function call(path, body) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "요청을 처리하지 못했습니다.");
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const sendCode = async () => (await call("code", { email })) && setStep(2);
  const verify = async () => (await call("verify", { email, code })) && setStep(3);
  const signup = async () =>
    (await call("signup", { email, password, nickname })) && setDone(true);

  if (done) {
    return (
      <div style={S.wrap}>
        <h2 style={S.h2}>가입 완료</h2>
        <p style={S.muted}>이제 로그인할 수 있습니다.</p>
        <a href="/login" style={S.btn}>로그인하러 가기</a>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>회원가입</h2>
      <p style={S.step}>{step} / 3 단계</p>
      {error && <p style={S.error}>{error}</p>}

      {step === 1 && (
        <>
          <label style={S.label}>이메일</label>
          <input
            style={S.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button style={S.btn} onClick={sendCode} disabled={busy || !email}>
            {busy ? "보내는 중…" : "인증코드 받기"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p style={S.muted}>{email} 로 코드를 보냈습니다. 5분 안에 입력해 주세요.</p>
          <label style={S.label}>인증코드 6자리</label>
          <input
            style={S.input}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
          <button style={S.btn} onClick={verify} disabled={busy || code.length !== 6}>
            {busy ? "확인 중…" : "코드 확인"}
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <label style={S.label}>닉네임</label>
          <input
            style={S.input}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <label style={S.label}>비밀번호 (8자 이상)</label>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            style={S.btn}
            onClick={signup}
            disabled={busy || password.length < 8 || !nickname}
          >
            {busy ? "가입 중…" : "가입하기"}
          </button>
        </>
      )}
    </div>
  );
}

const S = {
  wrap: { maxWidth: 380, margin: "60px auto", fontFamily: "sans-serif", color: "#1a1d24" },
  h2: { fontSize: 24, marginBottom: 4 },
  step: { fontSize: 13, color: "#9ca3af", marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 14 },
  input: { width: "100%", padding: "11px 13px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, boxSizing: "border-box" },
  btn: { display: "block", width: "100%", marginTop: 20, padding: "12px", border: "none", borderRadius: 8, background: "#8b7cf6", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center", textDecoration: "none" },
  error: { color: "#ef4444", background: "#fef2f2", padding: "10px 13px", borderRadius: 8, fontSize: 14 },
  muted: { color: "#6b7280", fontSize: 14, marginBottom: 8 },
};
