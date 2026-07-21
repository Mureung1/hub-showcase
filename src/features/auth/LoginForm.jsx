import { useState } from "react";
import Button from "../../components/Button.jsx";
import { useAuth } from "./AuthContext.jsx";
import "./AuthForm.css";

export default function LoginForm({ onSwitchToSignup }) {
  const { login } = useAuth();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(employeeNo, password);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">
        <span>사번</span>
        <input
          type="text"
          value={employeeNo}
          onChange={(e) => setEmployeeNo(e.target.value)}
          placeholder="사번을 입력하세요"
          autoComplete="username"
          required
        />
      </label>

      <label className="auth-form__field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <Button type="submit" disabled={loading} className="auth-form__submit">
        {loading ? "로그인 중..." : "로그인"}
      </Button>

      <button type="button" className="auth-form__switch" onClick={onSwitchToSignup}>
        계정이 없으신가요? 회원가입
      </button>
    </form>
  );
}
