// screens/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";
import PrimaryButton from "../components/PrimaryButton";
import { supabase } from "../api/supabaseClient";

export default function LoginScreen({ onLogin, onNavigateToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("confirm")
          ? "이메일 인증이 아직 완료되지 않았어요. 가입 시 받은 메일의 링크를 먼저 확인해주세요."
          : "이메일 또는 비밀번호가 올바르지 않아요."
      );
      return;
    }
    onLogin?.(data.user);
  }

  return (
    <form className="login-screen" onSubmit={handleSubmit}>
      <div className="login-screen__brand">
        <p className="login-screen__title">Campus Scheduler</p>
        <p className="login-screen__subtitle">조건에 맞는 시간표를 추천해드려요</p>
      </div>

      <div className="field-list">
        <div className="field">
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="school@campus.ac.kr"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      {error && <p className="login-screen__error">{error}</p>}

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? "로그인 중..." : "로그인"}
      </PrimaryButton>

      <button type="button" className="login-screen__link" onClick={() => onNavigateToSignup?.()}>
        계정이 없으신가요? 회원가입
      </button>
    </form>
  );
}
