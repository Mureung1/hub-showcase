import { useState } from "react";   // react에서 핵심인 usestate
import { supabase } from "./supabaseClient";

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

function LoginScreen() {
  const [mode, setMode] = useState("login"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [gender, setGender] = useState(null);
  const [hideGender, setHideGender] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (mode === "signup") {
      if (!name.trim()) {
        setError("이름을 입력해주세요.");
        return;
      }
      if (!gender) {
        setError("성별을 선택해주세요.");
        return;
      }
    }

    setSubmitting(true);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) {
        console.error("signUp error:", signUpError);
        setError("회원가입에 실패했어요. 이미 가입된 이메일일 수 있어요.");
      } else {
        // 세션이 생기기 전(이메일 확인 전)이라 프로필을 바로 저장할 수 없어서, 확인 링크를 누른 직후
        // App.jsx가 자동으로 저장하도록 브라우저에 임시로 남겨둠
        localStorage.setItem(
          "ridesplit_pending_profile",
          JSON.stringify({ name, college, gender, hide_gender: hideGender })
        );
        if (!data.session) {
          // 이메일 확인이 필요한 경우: 세션이 바로 오지 않고, 메일의 링크를 눌러야 로그인이 완료됨
          setSent(true);
        }
        // data.session이 바로 오면 App.jsx가 onAuthStateChange로 감지해서 자동으로 넘어감
      }
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
            <label htmlFor="login-email" style={{ display: "block", fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
              학교 이메일
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <input
                id="login-email"
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
            <label htmlFor="login-password" style={{ display: "block", fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", fontSize: 15, fontWeight: 600, border: "none", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {mode === "signup" && (
            <>
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
                <label htmlFor="signup-name" style={{ display: "block", fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
                  이름
                </label>
                <input
                  id="signup-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", fontSize: 15, fontWeight: 600, border: "none", outline: "none", boxSizing: "border-box" }}
                />
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
                <label htmlFor="signup-college" style={{ display: "block", fontSize: 11, color: "#8A7A76", marginBottom: 6, fontWeight: 600 }}>
                  단과대
                </label>
                <input
                  id="signup-college"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="예: 경영학과"
                  style={{ width: "100%", fontSize: 15, fontWeight: 600, border: "none", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 14, textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#8A7A76", marginBottom: 8, fontWeight: 600 }}>
                  성별
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={gender === opt.value}
                      onClick={() => setGender(opt.value)}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        border: gender === opt.value ? "none" : "1px solid rgba(36,21,18,0.12)",
                        background: gender === opt.value ? "#C8102E" : "#fff",
                        color: gender === opt.value ? "#fff" : "#241512",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
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
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }} id="hide-gender-label">다른 사람에게 성별 비공개</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hideGender}
                  aria-labelledby="hide-gender-label"
                  onClick={() => setHideGender(!hideGender)}
                  style={{
                    width: 40,
                    height: 24,
                    borderRadius: 999,
                    border: "none",
                    background: hideGender ? "#C8102E" : "rgba(36,21,18,0.15)",
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: hideGender ? 19 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                </button>
              </div>
            </>
          )}

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
