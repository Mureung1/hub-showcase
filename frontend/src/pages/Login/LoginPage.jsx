import { useState } from "react";
import { loginUser } from "../../api/auth";
import { saveAuth } from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "./LoginPage.css";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin() {
    if (!isValidEmail(email)) {
      setError("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await loginUser(email, password);
      saveAuth(data.token, data.user);
      onLogin(data.user);
      navigate("/dashboard");
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && !isLoading) {
      handleLogin();
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>로그인</h1>

        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="login-button"
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>

        <p className="auth-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
