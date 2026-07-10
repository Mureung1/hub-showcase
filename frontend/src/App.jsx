import { useEffect, useState } from "react";
import { api } from "./api/client";
import { login, register, logout, fetchMe } from "./api/auth";
import { getToken } from "./api/client";

function App() {
  const [health, setHealth] = useState("확인 중...");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const healthUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "/health");
    fetch(healthUrl)
      .then((res) => (res.ok ? setHealth("정상") : setHealth("연결 실패 (백엔드를 확인하세요)")))
      .catch(() => setHealth("연결 실패 (백엔드를 확인하세요)"));

    if (getToken()) {
      fetchMe()
        .then(setUser)
        .catch(() => {});
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      if (mode === "register") {
        await register(form);
        setMessage("가입 완료. 로그인해주세요.");
        setMode("login");
      } else {
        const loggedInUser = await login(form);
        setUser(loggedInUser);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "요청에 실패했습니다.");
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>필메이트 개발환경</h1>
      <p>백엔드 상태: {health}</p>

      {user ? (
        <div>
          <p>{user.name}님 환영합니다 ({user.email})</p>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              placeholder="이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            placeholder="이메일"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit">{mode === "register" ? "회원가입" : "로그인"}</button>
          <button
            type="button"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "로그인으로" : "회원가입으로"}
          </button>
          {message && <p>{message}</p>}
        </form>
      )}
    </div>
  );
}

export default App;
