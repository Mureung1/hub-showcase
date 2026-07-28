import { useState } from "react";   // react에서 핵심인 usestate
import { supabase } from "./supabaseClient";

function LoginScreen() {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) {
        console.error("signUp error:", signUpError);
        setError("회원가입에 실패했어요. 이미 가입된 이메일일 수 있어요.");
      } else if (!data.session) {
        // 이메일 확인이 필요한 경우: 세션이 바로 오지 않고, 메일의 링크를 눌러야 로그인이 완료됨
        setSent(true);
      }
      // data.session이 바로 오면 App.jsx가 onAuthStateChange로 감지해서 자동으로 넘어감
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        console.error("signInWithPassword error:", loginError);
        setError("이메일 또는 비밀번호가 올바르지 않아요.");
      }
      // 성공하면 App.jsx의 onAuthStateChange가 세션을 감지해서 자동으로 화면을 넘겨줌
    }

    setSubmitting(false);
  }

  async function handleGuestLogin() {
    setGuestLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("signInAnonymously error:", error);
      setError("게스트 로그인에 실패했어요.");
      setGuestLoading(false);
    }
    // 성공하면 App.jsx의 onAuthStateChange가 세션을 감지해서 자동으로 화면을 넘겨줌
  }

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
        {mode === "signup" ? "학교 이메일로 회원가입" : "로그인"}
      </h1>

      {sent ? (
        <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6, marginTop: 20 }}>
          {email}로 가입 확인 메일을 보냈어요.
          <br />
          메일함에서 링크를 눌러 가입을 완료해주세요.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
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
                type="email"
                required
                pattern=".+\.ac\.kr"
                title="학교 이메일(.ac.kr) 형식으로 입력해주세요"
                placeholder="jieun@univ.ac.kr"
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

          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(36,21,18,0.08)",
              borderRadius: 16,
              padding: 16,
              textAlign: "left",
              margin: "0 0 14px",
            }}
          >
            <div style={{ fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
              비밀번호
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", fontSize: 15, fontWeight: 600, border: "none", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#C8102E", margin: "0 0 8px" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
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
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {mode === "signup"
              ? submitting ? "가입 중..." : "회원가입"
              : submitting ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
            }}
            style={{ border: "none", background: "none", color: "#8A7A76", fontSize: 12, padding: "10px 0 0", cursor: "pointer", textDecoration: "underline" }}
          >
            {mode === "signup" ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
          </button>
        </form>
      )}

      {!sent && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(36,21,18,0.1)" }} />
            <span style={{ fontSize: 11, color: "#8A7A76" }}>또는</span>
            <div style={{ flex: 1, height: 1, background: "rgba(36,21,18,0.1)" }} />
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={guestLoading}
            style={{
              width: "100%",
              padding: 14,
              background: "#fff",
              color: "#241512",
              border: "1px solid rgba(36,21,18,0.12)",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              cursor: guestLoading ? "default" : "pointer",
              opacity: guestLoading ? 0.7 : 1,
            }}
          >
            {guestLoading ? "접속 중..." : "게스트로 체험하기"}
          </button>
          <p style={{ fontSize: 11, color: "#8A7A76", margin: "8px 0 0" }}>
            이메일 인증 없이 둘러볼 수 있어요. 실제 학생 계정은 아니에요.
          </p>
        </>
      )}
    </div>
  );
}

export default LoginScreen;
