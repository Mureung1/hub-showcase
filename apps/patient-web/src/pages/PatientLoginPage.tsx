import { LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMockAuth } from "../auth/MockAuthContext";
import { AppHeader } from "../components/AppHeader";

export function PatientLoginPage() {
  const { session, signIn } = useMockAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("patient@example.com");
  const [password, setPassword] = useState("mock-password");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";

  if (session) return <Navigate to={returnTo} replace />;

  function submit() {
    if (!emailValid || !passwordValid) return;
    signIn(email.trim());
    navigate(returnTo, { replace: true });
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="auth-page content-width">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="segmented-control" aria-label="계정 화면">
            <button
              className={mode === "login" ? "is-selected" : ""}
              type="button"
              onClick={() => setMode("login")}
            >
              로그인
            </button>
            <button
              className={mode === "signup" ? "is-selected" : ""}
              type="button"
              onClick={() => setMode("signup")}
            >
              회원가입
            </button>
          </div>
          <h1 id="auth-title">{mode === "login" ? "환자 로그인" : "환자 회원가입"}</h1>
          <p>현재 화면은 Supabase Auth 연결 전 동작을 확인하는 mock입니다.</p>
          <label>
            이메일
            <span className="auth-input">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </span>
          </label>
          <label>
            비밀번호
            <span className="auth-input">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </span>
          </label>
          {!emailValid && <p className="field-error">올바른 이메일을 입력해 주세요.</p>}
          {!passwordValid && <p className="field-error">비밀번호는 8자 이상이어야 합니다.</p>}
          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={!emailValid || !passwordValid}
          >
            {mode === "login" ? "로그인" : "가입하고 로그인"}
          </button>
        </section>
      </main>
    </div>
  );
}
