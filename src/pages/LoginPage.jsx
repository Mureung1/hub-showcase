import { useState } from "react";
import { login, register } from "../services/groupBuysApi";

function LoginPage({ onLogin, onNavigate }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSaving(true); setMessage("");
    try {
      const input = { email: data.get("email"), password: data.get("password") };
      const result = mode === "register" ? await register({ ...input, nickname: data.get("nickname") }) : await login(input);
      onLogin(result); onNavigate("/group-buys");
    } catch (error) { setMessage(error.message); }
    finally { setIsSaving(false); }
  }

  return <main className="auth-page"><section className="auth-story"><span className="kicker">CAMPUS PEOPLE</span><h1>같이 사는 사람을<br /><em>이름으로 만나요.</em></h1><p>로그인하면 참여한 사람의 닉네임을 확인하고, 내 공동구매 활동도 이어서 관리할 수 있어요.</p><div className="auth-tags"><span>닉네임 참여</span><span>중복 참여 방지</span><span>활동 기록 유지</span></div></section><section className="auth-card"><div className="auth-tabs"><button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>로그인</button><button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>회원가입</button></div><h2>{mode === "login" ? "다시 만나서 반가워요" : "캠퍼스 이웃으로 시작하기"}</h2><p>{mode === "login" ? "가입한 이메일로 로그인해 주세요." : "화면에 표시할 닉네임을 정해주세요."}</p><form onSubmit={submit}>{mode === "register" && <label>닉네임<input name="nickname" minLength="2" maxLength="12" placeholder="예: 기숙사 민지" required /></label>}<label>이메일<input name="email" type="email" placeholder="name@school.ac.kr" required /></label><label>비밀번호<input name="password" type="password" minLength="6" placeholder="6자 이상" required /></label>{message && <div className="auth-error">{message}</div>}<button className="primary-button" disabled={isSaving} type="submit">{isSaving ? "처리 중..." : mode === "login" ? "로그인" : "회원가입하고 시작"}</button></form></section></main>;
}

export default LoginPage;
