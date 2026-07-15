// 로그인 입력창의 기본틀
import { useState } from "react";
import { loginUser } from "../../api/auth";
import { saveAuth } from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

   const navigate = useNavigate();

  // 로그인 버튼을 눌렀을 때 실행되는 함수
    async function handleLogin() {
        if (!isValidEmail(email)) {
            setError("올바른 이메일 형식으로 입력해주세요.");
            return;
        }

        try {
        const data = await loginUser(email, password);

        setError("");
        saveAuth(data.token, data.user);
        onLogin(data.user);
        navigate("/dashboard");

        alert("로그인 성공!");
        } catch (error) {
            setError(error.message);
        }
    }

  return (
    <main>
      <h1>로그인</h1>

      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <p>{error}</p>}

      <button type="button" onClick={handleLogin}>
        로그인
      </button>
      <p>
        계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
    </main>
  );
}

export default LoginPage;
