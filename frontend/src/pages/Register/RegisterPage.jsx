import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";

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

  const navigate = useNavigate();

  // 회원가입함수
  async function handleRegister() {
  if (!isValidEmail(email)) {
    setError("올바른 이메일 형식으로 입력해주세요.");
    return;
  }

  if (!isValidPassword(password)) {
    setError("비밀번호는 8자 이상으로 입력해주세요.");
    return;
  }

  try {
    await registerUser(name, email, password);

    alert("회원가입이 완료되었습니다.");

    navigate("/login");
  } catch (error) {
    setError(error.message);
  }
}


  return (
    <main>
      <h1>회원가입</h1>

      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

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

      <button type="button" onClick={handleRegister}>
        회원가입
        </button>

      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </main>
  );
}

export default RegisterPage;
