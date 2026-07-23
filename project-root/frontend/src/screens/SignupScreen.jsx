// screens/SignupScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import { supabase } from "../api/supabaseClient";

export default function SignupScreen({ onSignedUp, onNavigateToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }

    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // 이메일 확인이 켜져 있으면 session이 없어서 바로 로그인 상태가 되지 않음
    if (data.session) {
      onSignedUp?.(data.user);
    } else {
      setNotice("가입 확인 메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.");
    }
  }

  return (
    <form className="login-screen" onSubmit={handleSubmit}>
      <div className="login-screen__brand">
        <p className="login-screen__title">회원가입</p>
        <p className="login-screen__subtitle">계정을 만들고 내 시간표를 저장해보세요</p>
      </div>

      <div className="field-list">
        <div className="field">
          <label htmlFor="signup-email">이메일</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="school@campus.ac.kr"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">비밀번호</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            minLength={6}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password-confirm">비밀번호 확인</label>
          <input
            id="signup-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>
      </div>

      {error && <p className="login-screen__error">{error}</p>}
      {notice && <p className="login-screen__notice">{notice}</p>}

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? "가입 중..." : "회원가입"}
      </PrimaryButton>

      <button type="button" className="login-screen__link" onClick={() => onNavigateToLogin?.()}>
        이미 계정이 있으신가요? 로그인
      </button>
    </form>
  );
}
