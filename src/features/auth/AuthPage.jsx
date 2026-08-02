import { useState } from "react";
import LoginForm from "./LoginForm.jsx";
import SignupForm from "./SignupForm.jsx";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");

  function switchToLogin() {
    setNotice("");
    setMode("login");
  }

  function switchToSignup() {
    setNotice("");
    setMode("signup");
  }

  function handleSignupSuccess() {
    setNotice("회원가입이 완료되었습니다. 로그인해주세요.");
    setMode("login");
  }

  return (
    <div className="auth-page">
      <div className="auth-page__panel">
        <div className="auth-page__logo">SG</div>
        <h1 className="auth-page__title">세이프게이트</h1>
        <p className="auth-page__subtitle">
          {mode === "login" ? "사번으로 로그인하세요" : "사번으로 계정을 생성하세요"}
        </p>

        {notice && mode === "login" && <p className="auth-page__notice">{notice}</p>}

        {mode === "login" && (
          <div className="auth-page__demo">
            <span className="auth-page__demo-label">체험용 계정</span>
            <span className="auth-page__demo-creds">
              사번 <b>1</b> · 비밀번호 <b>12345678</b>
            </span>
          </div>
        )}

        {mode === "login" ? (
          <LoginForm onSwitchToSignup={switchToSignup} />
        ) : (
          <SignupForm onSignupSuccess={handleSignupSuccess} onSwitchToLogin={switchToLogin} />
        )}
      </div>
    </div>
  );
}
