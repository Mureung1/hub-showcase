import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";
import "./RegisterPage.css";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleRegister() {
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    if (!isValidPassword(password)) {
      setError("비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await registerUser(name, email, password);
      navigate("/login");
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && !isLoading) {
      handleRegister();
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>회원가입</h1>

        <div className="form-group">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
        </div>

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
          className="register-button"
          type="button"
          onClick={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? "회원가입 중..." : "회원가입"}
        </button>

        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
