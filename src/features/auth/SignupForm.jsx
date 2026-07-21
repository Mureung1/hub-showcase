import { useState } from "react";
import Button from "../../components/Button.jsx";
import { useAuth } from "./AuthContext.jsx";
import "./AuthForm.css";

export default function SignupForm({ onSignupSuccess, onSwitchToLogin }) {
  const { signup } = useAuth();
  const [employeeNo, setEmployeeNo] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await signup({ employeeNo, name, password, department: department || undefined });
      onSignupSuccess();
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? "회원가입에 실패했습니다.");
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
        <span>이름</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          required
        />
      </label>

      <label className="auth-form__field">
        <span>부서 (선택)</span>
        <input
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="부서를 입력하세요"
        />
      </label>

      <label className="auth-form__field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          autoComplete="new-password"
          required
        />
      </label>

      <label className="auth-form__field">
        <span>비밀번호 확인</span>
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="비밀번호를 다시 입력하세요"
          autoComplete="new-password"
          required
        />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <Button type="submit" disabled={loading} className="auth-form__submit">
        {loading ? "가입 중..." : "회원가입"}
      </Button>

      <button type="button" className="auth-form__switch" onClick={onSwitchToLogin}>
        이미 계정이 있으신가요? 로그인
      </button>
    </form>
  );
}
