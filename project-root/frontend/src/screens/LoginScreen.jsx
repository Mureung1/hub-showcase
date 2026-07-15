// screens/LoginScreen.jsx
import { useState } from "react";
import "./LoginScreen.css";
import PrimaryButton from "../components/PrimaryButton";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onLogin?.({ email });
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
          />
        </div>
      </div>

      <PrimaryButton type="submit">로그인</PrimaryButton>
    </form>
  );
}
